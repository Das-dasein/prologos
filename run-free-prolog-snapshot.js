"use strict";
// Runs exactly one versioned, data-only experiment snapshot.  The snapshot and
// frozen prompt are hashed into the raw aggregate before any model output exists.
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const { collect } = require("./free-prolog-diagnostic-collector");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function get(url) { return new Promise((resolve, reject) => https.get(url, response => {
  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(get(new URL(response.headers.location, url).toString()));
  if (response.statusCode !== 200) return reject(new Error(`source download failed (${response.statusCode})`));
  const chunks = []; response.on("data", chunk => chunks.push(chunk)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject);
}).on("error", reject)); }
function readSnapshot(snapshotFile) {
  const file = path.resolve(snapshotFile), text = fs.readFileSync(file, "utf8"), spec = JSON.parse(text);
  if (!spec || spec.schema_version !== "free-prolog-experiment-snapshot-v1" || spec.status !== "ready-to-run" || typeof spec.experiment_id !== "string" || typeof spec.model !== "string" || !Number.isInteger(spec.max_model_calls) || spec.max_model_calls < 1 || spec.max_model_calls > 8 || !spec.source || !Number.isInteger(spec.source.case_id) || !/^[a-f0-9]{64}$/.test(spec.source.sha256) || typeof spec.prompt_file !== "string") throw new Error("invalid experiment snapshot");
  return Object.freeze({ ...spec, file: fs.realpathSync(file), sha256: sha256(text), prompt_file: path.resolve(path.dirname(file), spec.prompt_file) });
}
async function main(snapshotFile) {
  const spec = readSnapshot(snapshotFile), source = await get(spec.source.url);
  if (sha256(source) !== spec.source.sha256) throw new Error("downloaded source SHA-256 does not match snapshot");
  const row = JSON.parse(source.toString("utf8")).find(item => item && item.id === spec.source.case_id);
  if (!row || typeof row.context !== "string" || typeof row.question !== "string") throw new Error("snapshot case missing from verified source");
  const fixture = { schema_version: "free-prolog-diagnostic-fixture-v1", cases: [{ case_id: `proverqa-hard-${row.id}`, context: row.context, question: row.question }] };
  const rawRoot = path.join(path.dirname(spec.file), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const result = await collect({ fixture, rawRoot, generate: createCodexFreePrologGenerator({ codexPath: "/Users/artem/.local/bin/codex", model: spec.model }), promptVersion: "v8-reflect-then-formalize", promptFile: spec.prompt_file, provenance: { snapshot_file: spec.file, snapshot_sha256: spec.sha256, source_sha256: spec.source.sha256, model: spec.model, max_model_calls: spec.max_model_calls }, maxRepairAttempts: spec.max_model_calls - 1, forceRepairAfterInitial: spec.force_repair_after_initial === true, retryOnConflict: Array.isArray(spec.retry_conditions) && spec.retry_conditions.includes("conflict"), timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
  process.stdout.write(JSON.stringify({ raw_root: rawRoot, model_calls: result.records[0].attempts.length, final_outcome: result.records[0].observation && result.records[0].observation.execution_outcome }, null, 2) + "\n");
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { readSnapshot };
