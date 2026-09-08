"use strict";

const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");
const { loadFrozenPrompt, promptFor } = require("./free-prolog-diagnostic-collector");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const VERDICT_SCHEMA = { type: "object", additionalProperties: false, required: ["answer", "proof_tree"], properties: { answer: { type: "string", enum: ["A", "B", "C"] }, proof_tree: { type: "string" } } };
function download(url) {
  return new Promise((resolve, reject) => https.get(url, response => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(download(new URL(response.headers.location, url)));
    if (response.statusCode !== 200) return reject(new Error(`source download failed (${response.statusCode})`));
    const chunks = []; response.on("data", chunk => chunks.push(chunk)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject);
  }).on("error", reject));
}
function invokeVerdict({ model, prompt }) {
  return new Promise((resolve, reject) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-horn-verdict-")), schemaFile = path.join(root, "schema.json"), finalFile = path.join(root, "final.json");
    fs.writeFileSync(schemaFile, JSON.stringify(VERDICT_SCHEMA), { encoding: "utf8", mode: 0o600 });
    const child = childProcess.spawn("/Users/artem/.local/bin/codex", ["exec", "--json", "--ephemeral", "-C", root, "--skip-git-repo-check", "--sandbox", "read-only", "--model", model, "--output-schema", schemaFile, "--output-last-message", finalFile, "-"], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [], stderr = []; child.stdout.on("data", chunk => stdout.push(chunk)); child.stderr.on("data", chunk => stderr.push(chunk)); child.on("error", error => { fs.rmSync(root, { recursive: true, force: true }); reject(error); });
    child.on("close", code => {
      try {
        if (code !== 0) throw new Error(`Codex verdict failed (${code}): ${Buffer.concat(stderr).toString("utf8").trim()}`);
        resolve({ verdict: JSON.parse(fs.readFileSync(finalFile, "utf8")), stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
      } catch (error) { reject(error); } finally { fs.rmSync(root, { recursive: true, force: true }); }
    });
    child.stdin.end(prompt);
  });
}
function rendered(template, values) {
  const result = template.replace("{{program}}", values.program).replace("{{query}}", values.query).replace("{{transcript}}", values.transcript);
  if (result.includes("{{")) throw new Error("unrendered verdict prompt placeholder");
  return result;
}
function expectedProofTree(transcript) {
  const binding = transcript.match(/^PAM_DIAGNOSTIC_BINDINGS: (.+)$/m);
  if (!binding) return null;
  const match = binding[1].match(/,(proof_tree\(.*\))\)$/);
  return match ? match[1] : null;
}
async function main(snapshotArg) {
  const snapshotFile = path.resolve(snapshotArg), snapshotText = fs.readFileSync(snapshotFile, "utf8"), spec = JSON.parse(snapshotText);
  if (!spec || spec.schema_version !== "proverqa-horn-tree-verdict-snapshot-v1" || spec.status !== "ready-to-run" || spec.max_model_calls !== 2) throw new Error("invalid Horn-tree verdict snapshot");
  const sourceBytes = await download(spec.source.url); if (sha256(sourceBytes) !== spec.source.sha256) throw new Error("source SHA-256 mismatch");
  const row = JSON.parse(sourceBytes).find(item => item.id === spec.source.case_id); if (!row) throw new Error("source case missing");
  const formalizationPrompt = promptFor({ context: row.context, question: row.question }, "v8-reflect-then-formalize", loadFrozenPrompt(path.resolve(path.dirname(snapshotFile), spec.formalization_prompt_file)));
  const formalization = await createCodexFreePrologGenerator({ codexPath: "/Users/artem/.local/bin/codex", model: spec.model })({ prompt: formalizationPrompt });
  const observation = await runFreePrologDiagnostic({ caseId: `proverqa-hard-${row.id}-horn-tree-verdict`, program: formalization.program, query: formalization.query, source: "horn-tree-formalizer", timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
  const transcript = observation.runtime.transcript.transcript, expected = expectedProofTree(transcript);
  const verdictTemplate = fs.readFileSync(path.resolve(path.dirname(snapshotFile), spec.verdict_prompt_file), "utf8"), verdictPrompt = rendered(verdictTemplate, { program: formalization.program, query: formalization.query, transcript });
  const verdictRun = await invokeVerdict({ model: spec.model, prompt: verdictPrompt });
  const verification = { expected_proof_tree: expected, execution_succeeded: observation.execution_outcome === "succeeded", verdict_answer_is_A: verdictRun.verdict.answer === "A", verdict_tree_exact_match: expected !== null && verdictRun.verdict.proof_tree === expected, passed: observation.execution_outcome === "succeeded" && verdictRun.verdict.answer === "A" && expected !== null && verdictRun.verdict.proof_tree === expected };
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 });
  fs.writeFileSync(path.join(root, "record.json"), stable({ status: spec.result_status, provenance: { snapshot_file: snapshotFile, snapshot_sha256: sha256(snapshotText), source_sha256: spec.source.sha256, source_case_id: row.id, model: spec.model }, formalization_prompt: formalizationPrompt, formalization, observation, verdict_prompt: verdictPrompt, verdict: verdictRun.verdict, verification }));
  console.log(JSON.stringify({ raw_root: root, verification, verdict: verdictRun.verdict }, null, 2));
}
main(process.argv[2]).then(() => process.exit(0)).catch(error => { console.error(error.stack || error); process.exit(1); });
