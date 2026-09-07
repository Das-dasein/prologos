"use strict";
// Frozen five-case P0/P1/P2 diagnostic.  It is deliberately small and records
// every prompt, model response, and P2 execution trace; it is not an effect claim.
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { collect } = require("./free-prolog-diagnostic-collector");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const CODEx = "/Users/artem/.local/bin/codex";
const answerSchema = Object.freeze({ type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string", enum: ["A", "B", "C"] } } });
const p1Schema = Object.freeze({ type: "object", additionalProperties: false, required: ["program", "query", "answer"], properties: { program: { type: "string" }, query: { type: "string" }, answer: { type: "string", enum: ["A", "B", "C"] } } });
function get(url) { return new Promise((resolve, reject) => https.get(url, response => { if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(get(new URL(response.headers.location, url))); if (response.statusCode !== 200) return reject(Error(`source download failed (${response.statusCode})`)); const chunks = []; response.on("data", c => chunks.push(c)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject); }).on("error", reject)); }
function run(command, args, cwd, prompt) { return new Promise((resolve, reject) => { const child = childProcess.spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] }), out = [], err = []; child.stdout.on("data", c => out.push(c)); child.stderr.on("data", c => err.push(c)); child.on("error", reject); child.on("close", code => code === 0 ? resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }) : reject(Error(`codex exec failed (${code}): ${Buffer.concat(err).toString("utf8")}`))); child.stdin.end(prompt); }); }
function select(rows, seed) { return [...rows].sort((a, b) => sha256(`${seed}:${a.id}`).localeCompare(sha256(`${seed}:${b.id}`)) || a.id - b.id).slice(0, 5).sort((a, b) => a.id - b.id); }
function template(file, row) { const text = fs.readFileSync(file, "utf8"); const rendered = text.replace("{{context}}", row.context).replace("{{question}}", row.question); if (rendered.includes("{{")) throw Error(`unrendered prompt in ${file}`); return rendered; }
function statusToAnswer(record) { const text = record && record.observation && record.observation.runtime && record.observation.runtime.transcript && record.observation.runtime.transcript.transcript || ""; const match = text.match(/PAM_DIAGNOSTIC_BINDINGS:[\s\S]*?,(entailed|contradicted|unknown),/); return match ? ({ entailed: "A", contradicted: "B", unknown: "C" })[match[1]] : null; }
async function direct({ model, prompt, schema }) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-five-case-")), schemaFile = path.join(temp, "schema.json"), finalFile = path.join(temp, "final.json");
  fs.writeFileSync(schemaFile, JSON.stringify(schema), { mode: 0o600 });
  try { const output = await run(CODEx, ["exec", "--json", "--ephemeral", "-C", temp, "--skip-git-repo-check", "--sandbox", "read-only", "--model", model, "--output-schema", schemaFile, "--output-last-message", finalFile, "-"], temp, prompt); return { final: JSON.parse(fs.readFileSync(finalFile, "utf8")), ...output }; } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
async function condition(root, name, rows, promptFile, model, schema) {
  const folder = path.join(root, name); fs.mkdirSync(folder, { mode: 0o700 }); const records = [];
  for (const row of rows) {
    const prompt = template(promptFile, row); let output = null, error = null;
    try { output = await direct({ model, prompt, schema }); } catch (caught) { error = String(caught && (caught.stack || caught.message) || caught); }
    const record = { case_id: `proverqa-hard-${row.id}`, source_answer: row.answer, answer: output && output.final.answer || null, correct: Boolean(output && output.final.answer === row.answer), transport_error: error, prompt_sha256: sha256(prompt), prompt, output: output && output.final || null, codex_stdout: output && output.stdout || null, codex_stderr: output && output.stderr || null };
    fs.writeFileSync(path.join(folder, `${record.case_id}.json`), stable(record), { flag: "wx", mode: 0o600 }); records.push(record);
  }
  return records;
}
function summary(records) { const valid = records.filter(row => row.answer && !row.transport_error), correct = valid.filter(row => row.correct); return { planned: records.length, valid: valid.length, correct: correct.length, accuracy_among_valid: valid.length ? correct.length / valid.length : null }; }
async function main(arg) {
  const snapshotFile = path.resolve(arg), snapshotText = fs.readFileSync(snapshotFile, "utf8"), spec = JSON.parse(snapshotText);
  if (!spec || spec.schema_version !== "proverqa-five-case-pilot-snapshot-v1" || spec.status !== "ready-to-run" || !spec.source || !spec.selection || !spec.prompts || !Number.isInteger(spec.p2_max_model_calls)) throw Error("invalid five-case snapshot");
  const source = await get(spec.source.url); if (sha256(source) !== spec.source.sha256) throw Error("source SHA-256 mismatch"); const rows = select(JSON.parse(source), spec.selection.seed);
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 });
  const p0Prompt = path.resolve(path.dirname(snapshotFile), spec.prompts.p0), p1Prompt = path.resolve(path.dirname(snapshotFile), spec.prompts.p1), p2Prompt = path.resolve(path.dirname(snapshotFile), spec.prompts.p2);
  const p0 = await condition(root, "p0", rows, p0Prompt, spec.model, answerSchema);
  const p1 = await condition(root, "p1", rows, p1Prompt, spec.model, p1Schema);
  const fixture = { schema_version: "free-prolog-diagnostic-fixture-v1", cases: rows.map(row => ({ case_id: `proverqa-hard-${row.id}`, context: row.context, question: row.question })) };
  const p2Result = await collect({ fixture, rawRoot: path.join(root, "p2"), generate: createCodexFreePrologGenerator({ codexPath: CODEx, model: spec.model }), promptVersion: "v8-reflect-then-formalize", promptFile: p2Prompt, provenance: { snapshot_file: snapshotFile, snapshot_sha256: sha256(snapshotText), source_sha256: spec.source.sha256, selected_source_ids: rows.map(row => row.id), model: spec.model }, maxRepairAttempts: spec.p2_max_model_calls - 1, retryOnConflict: true, timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
  const p2 = p2Result.records.map((record, index) => ({ case_id: record.case_id, source_answer: rows[index].answer, answer: statusToAnswer(record), correct: statusToAnswer(record) === rows[index].answer, model_calls: record.attempts.length, record }));
  const aggregate = { schema_version: "proverqa-five-case-pilot-run-v1", status: spec.result_status, provenance: { snapshot_file: snapshotFile, snapshot_sha256: sha256(snapshotText), source_sha256: spec.source.sha256, selected_source_ids: rows.map(row => row.id), model: spec.model, prompt_sha256: { p0: sha256(fs.readFileSync(p0Prompt)), p1: sha256(fs.readFileSync(p1Prompt)), p2: sha256(fs.readFileSync(p2Prompt)) } }, summary: { P0: summary(p0), P1: summary(p1), P2: summary(p2) }, records: { P0: p0, P1: p1, P2: p2.map(({ record, ...visible }) => visible) } };
  fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), stable(aggregate), { flag: "wx", mode: 0o600 }); process.stdout.write(JSON.stringify({ raw_root: root, selected_source_ids: rows.map(row => row.id), summary: aggregate.summary }, null, 2) + "\n");
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
