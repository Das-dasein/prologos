"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");
const { collect } = require("./free-prolog-diagnostic-collector");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
function download(url) {
  return new Promise((resolve, reject) => https.get(url, response => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(download(new URL(response.headers.location, url)));
    if (response.statusCode !== 200) return reject(new Error(`source download failed (${response.statusCode})`));
    const chunks = []; response.on("data", chunk => chunks.push(chunk)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject);
  }).on("error", reject));
}
async function main(snapshotArg) {
  const snapshotFile = path.resolve(snapshotArg), snapshotText = fs.readFileSync(snapshotFile, "utf8"), spec = JSON.parse(snapshotText);
  if (!spec || spec.schema_version !== "proverqa-horn-tree-probe-snapshot-v1" || spec.status !== "ready-to-run" || spec.max_model_calls !== 1) throw new Error("invalid Horn-tree probe snapshot");
  const sourceBytes = await download(spec.source.url);
  if (sha256(sourceBytes) !== spec.source.sha256) throw new Error("source SHA-256 mismatch");
  const sourceRows = JSON.parse(sourceBytes), row = sourceRows.find(item => item.id === spec.source.case_id);
  if (!row) throw new Error("source case missing");
  const fixture = { schema_version: "free-prolog-diagnostic-fixture-v1", cases: [{ case_id: `proverqa-hard-${row.id}`, context: row.context, question: row.question }] };
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const result = await collect({ fixture, rawRoot: root, generate: createCodexFreePrologGenerator({ codexPath: "/Users/artem/.local/bin/codex", model: spec.model }), promptVersion: "v8-reflect-then-formalize", promptFile: path.resolve(path.dirname(snapshotFile), spec.prompt_file), provenance: { snapshot_file: snapshotFile, snapshot_sha256: sha256(snapshotText), source_sha256: spec.source.sha256, source_case_id: row.id, model: spec.model }, maxRepairAttempts: 0, timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
  fs.writeFileSync(path.join(root, "summary.json"), stable({ status: spec.result_status, raw_root: root, query: result.records[0].generated && result.records[0].generated.query, execution_outcome: result.records[0].observation && result.records[0].observation.execution_outcome }));
  console.log(JSON.stringify({ raw_root: root, query: result.records[0].generated && result.records[0].generated.query, transcript: result.records[0].observation && result.records[0].observation.runtime.transcript.transcript }, null, 2));
}
main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
