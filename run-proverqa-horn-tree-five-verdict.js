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
function download(url) { return new Promise((resolve, reject) => https.get(url, response => { if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(download(new URL(response.headers.location, url))); if (response.statusCode !== 200) return reject(new Error(`source download failed (${response.statusCode})`)); const chunks = []; response.on("data", chunk => chunks.push(chunk)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject); }).on("error", reject)); }
function render(template, values) { const result = Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), template); if (result.includes("{{")) throw new Error("unrendered prompt placeholder"); return result; }
function expectedProofTree(transcript) { const binding = transcript.match(/^PAM_DIAGNOSTIC_BINDINGS: (.+)$/m), match = binding && binding[1].match(/,(proof_tree\(.*\))\)$/); return match ? match[1] : null; }
function formalizationContract(program, row) {
  const labels = [...program.matchAll(/^\s*axiom\((s\d+),/gm)].map(match => match[1]), expected = Object.keys(row.nl2fol).length;
  const expectedLabels = Array.from({ length: expected }, (_, index) => `s${index + 1}`);
  const topLevelDomain = /^\s*domain\(person\s*,\s*\[/m.test(program);
  return Object.freeze({ expected_source_axioms: expected, observed_axioms: labels.length, labels_are_exact_source_sequence: labels.length === expected && labels.every((label, index) => label === expectedLabels[index]), top_level_person_domain: topLevelDomain, valid: topLevelDomain && labels.length === expected && labels.every((label, index) => label === expectedLabels[index]) });
}
function invokeVerdict({ model, prompt }) {
  return new Promise((resolve, reject) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-horn-five-verdict-")), schemaFile = path.join(root, "schema.json"), finalFile = path.join(root, "final.json"); fs.writeFileSync(schemaFile, JSON.stringify(VERDICT_SCHEMA), { mode: 0o600 });
    const child = childProcess.spawn("/Users/artem/.local/bin/codex", ["exec", "--json", "--ephemeral", "-C", root, "--skip-git-repo-check", "--sandbox", "read-only", "--model", model, "--output-schema", schemaFile, "--output-last-message", finalFile, "-"], { cwd: root, stdio: ["pipe", "pipe", "pipe"] }); const stderr = [];
    child.stderr.on("data", chunk => stderr.push(chunk)); child.on("error", error => { fs.rmSync(root, { recursive: true, force: true }); reject(error); }); child.on("close", code => { try { if (code !== 0) throw new Error(`Codex verdict failed (${code}): ${Buffer.concat(stderr).toString("utf8").trim()}`); resolve(JSON.parse(fs.readFileSync(finalFile, "utf8"))); } catch (error) { reject(error); } finally { fs.rmSync(root, { recursive: true, force: true }); } }); child.stdin.end(prompt);
  });
}
async function main(snapshotArg) {
  const snapshotFile = path.resolve(snapshotArg), snapshotText = fs.readFileSync(snapshotFile, "utf8"), spec = JSON.parse(snapshotText);
  if (!spec || spec.schema_version !== "proverqa-horn-tree-five-verdict-snapshot-v1" || spec.status !== "ready-to-run" || spec.model_calls_per_probe !== 2 || !Array.isArray(spec.selection && spec.selection.probes) || spec.selection.probes.length !== 5) throw new Error("invalid five-probe Horn-tree snapshot");
  const sourceBytes = await download(spec.source.url); if (sha256(sourceBytes) !== spec.source.sha256) throw new Error("source SHA-256 mismatch"); const rows = JSON.parse(sourceBytes);
  const formalPromptSpec = loadFrozenPrompt(path.resolve(path.dirname(snapshotFile), spec.formalization_prompt_file)), verdictTemplate = fs.readFileSync(path.resolve(path.dirname(snapshotFile), spec.verdict_prompt_file), "utf8");
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 }); const records = [];
  for (const probe of spec.selection.probes) {
    const row = rows.find(item => item.id === probe.source_id); if (!row) throw new Error(`source case missing: ${probe.source_id}`);
    const renderedAddon = render(formalPromptSpec.initial_addon, probe), formalizationPrompt = promptFor({ context: row.context, question: row.question }, "v8-reflect-then-formalize", { ...formalPromptSpec, initial_addon: renderedAddon });
    let formalization = null, observation = null, verdictPrompt = null, verdict = null, error = null;
    try {
      formalization = await createCodexFreePrologGenerator({ codexPath: "/Users/artem/.local/bin/codex", model: spec.model })({ prompt: formalizationPrompt });
      observation = await runFreePrologDiagnostic({ caseId: `proverqa-hard-${row.id}-horn-tree-five`, program: formalization.program, query: formalization.query, source: "horn-tree-formalizer", timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
      verdictPrompt = render(verdictTemplate, { ...probe, program: formalization.program, query: formalization.query, transcript: observation.runtime.transcript.transcript }); verdict = await invokeVerdict({ model: spec.model, prompt: verdictPrompt });
    } catch (caught) { error = String(caught && (caught.stack || caught.message) || caught); }
    const contract = formalization ? formalizationContract(formalization.program, row) : null, expected = observation && expectedProofTree(observation.runtime.transcript.transcript), verification = { expected_proof_tree: expected, formalization_contract: contract, execution_succeeded: observation && observation.execution_outcome === "succeeded", verdict_answer_is_A: verdict && verdict.answer === "A", verdict_tree_exact_match: Boolean(expected && verdict && verdict.proof_tree === expected), passed: Boolean(contract && contract.valid && observation && observation.execution_outcome === "succeeded" && verdict && verdict.answer === "A" && expected && verdict.proof_tree === expected) };
    const record = { probe, source_question: row.question, formalization_prompt: formalizationPrompt, formalization, observation, verdict_prompt: verdictPrompt, verdict, verification, error }; fs.writeFileSync(path.join(root, `proverqa-hard-${row.id}.json`), stable(record), { mode: 0o600 }); records.push(record);
  }
  const aggregate = { status: spec.result_status, provenance: { snapshot_file: snapshotFile, snapshot_sha256: sha256(snapshotText), source_sha256: spec.source.sha256, model: spec.model }, summary: { planned: records.length, completed: records.filter(record => !record.error).length, passed: records.filter(record => record.verification.passed).length }, records: records.map(record => ({ source_id: record.probe.source_id, goal: record.probe.goal, verification: record.verification, error: record.error })) }; fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), stable(aggregate), { mode: 0o600 }); console.log(JSON.stringify({ raw_root: root, summary: aggregate.summary, records: aggregate.records }, null, 2));
}
main(process.argv[2]).then(() => process.exit(0)).catch(error => { console.error(error.stack || error); process.exit(1); });
