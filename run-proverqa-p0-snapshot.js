"use strict";
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const schema = { type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string", enum: ["A", "B", "C"] } } };
function get(url) { return new Promise((resolve, reject) => https.get(url, response => { if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(get(new URL(response.headers.location, url))); if (response.statusCode !== 200) return reject(Error(`source download failed (${response.statusCode})`)); const chunks = []; response.on("data", c => chunks.push(c)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject); }).on("error", reject)); }
function run(command, args, cwd, prompt) { return new Promise((resolve, reject) => { const p = childProcess.spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] }), out = [], err = []; p.stdout.on("data", c => out.push(c)); p.stderr.on("data", c => err.push(c)); p.on("error", reject); p.on("close", code => code === 0 ? resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }) : reject(Error(`codex exec failed (${code}): ${Buffer.concat(err).toString("utf8")}`))); p.stdin.end(prompt); }); }
async function main(snapshotArg) {
  const file = path.resolve(snapshotArg), snapshotText = fs.readFileSync(file, "utf8"), spec = JSON.parse(snapshotText);
  if (!spec || spec.schema_version !== "proverqa-p0-answer-snapshot-v1" || spec.status !== "ready-to-run" || spec.max_model_calls !== 1) throw Error("invalid P0 snapshot");
  const source = await get(spec.source.url); if (sha256(source) !== spec.source.sha256) throw Error("source SHA-256 mismatch");
  const row = JSON.parse(source).find(x => x.id === spec.source.case_id); if (!row) throw Error("case missing");
  const promptFile = path.resolve(path.dirname(file), spec.prompt_file), template = fs.readFileSync(promptFile, "utf8"), prompt = template.replace("{{context}}", row.context).replace("{{question}}", row.question);
  if (prompt.includes("{{")) throw Error("unrendered prompt placeholder");
  const root = path.join(path.dirname(file), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-p0-")), schemaFile = path.join(temp, "schema.json"), finalFile = path.join(temp, "final.json"); fs.writeFileSync(schemaFile, JSON.stringify(schema));
  try { const out = await run("/Users/artem/.local/bin/codex", ["exec", "--json", "--ephemeral", "-C", temp, "--skip-git-repo-check", "--sandbox", "read-only", "--model", spec.model, "--output-schema", schemaFile, "--output-last-message", finalFile, "-"], temp, prompt); const final = JSON.parse(fs.readFileSync(finalFile, "utf8")); const aggregate = { schema_version: "proverqa-p0-answer-run-v1", status: "observed-not-scored", provenance: { snapshot_file: fs.realpathSync(file), snapshot_sha256: sha256(snapshotText), prompt_file: fs.realpathSync(promptFile), prompt_sha256: sha256(prompt), source_sha256: spec.source.sha256, model: spec.model }, output: final }; fs.writeFileSync(path.join(root, "prompt.txt"), prompt); fs.writeFileSync(path.join(root, "codex-stdout.jsonl"), out.stdout); fs.writeFileSync(path.join(root, "codex-stderr.txt"), out.stderr); fs.writeFileSync(path.join(root, "final.json"), JSON.stringify(final, null, 2) + "\n"); fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), JSON.stringify(aggregate, null, 2) + "\n"); process.stdout.write(JSON.stringify({ raw_root: root, answer: final.answer }, null, 2) + "\n"); } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
