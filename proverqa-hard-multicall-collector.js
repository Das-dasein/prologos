"use strict";

// A separate live condition for the already preregistered P2-multicall-v1
// protocol.  It deliberately does not reuse or alter P2-one-call records.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");
const { createBroker } = require("./proverqa-hard-hybrid-broker");
const { createMulticallBrokers } = require("./proverqa-hard-multicall-broker");
const { parseMulticallJsonl } = require("./proverqa-hard-multicall-gate");
const { parse } = require("./proverqa-hard-hybrid-collector");
const { invokeCodex, parseCodexFinalOutput, readBrokerResult, resolveSwiplBinary } = require("./representation-live-evaluator");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const OUTPUT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string" } } });
function absoluteFile(value, label) { if (typeof value !== "string" || !path.isAbsolute(value) || !fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error(`${label} must be an existing absolute file`); return fs.realpathSync(value); }
function freshRoot(value) { if (typeof value !== "string" || !path.isAbsolute(value) || fs.existsSync(value) || !fs.statSync(path.dirname(value)).isDirectory()) throw new Error("rawRoot must be a fresh absolute path with an existing parent"); fs.mkdirSync(value, { mode: 0o700 }); }
function writeExclusive(file, content, mode = 0o600) { fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode }); return file; }
function artifact(root, file) { if (!fs.existsSync(file)) return null; const bytes = fs.readFileSync(file, "utf8"); return Object.freeze({ ref: `local://${path.relative(root, file).split(path.sep).join("/")}`, sha256: sha256(bytes) }); }
function discardPrivateAuth(invocation, run) { if (!invocation) return; const file = invocation.private_auth_file; if (typeof file !== "string" || path.dirname(file) !== run.state_dir || path.basename(file) !== "auth.json") throw new Error("refusing to remove a non-private Codex auth file"); fs.rmSync(file, { force: true }); }
function validateFixture(fixture) { if (!fixture || fixture.schema_version !== "proverqa-hard-hybrid-fixture-v1" || !Array.isArray(fixture.cases) || fixture.cases.length !== 12) throw new Error("expected a validated 12-case ProverQA-hard hybrid fixture"); for (const item of fixture.cases) if (!item.p0 || !item.p1 || !Array.isArray(item.private_formulas) || !["A", "B", "C"].includes(item.source_answer)) throw new Error(`malformed fixture case ${item && item.case_id}`); }
function promptFor(item, brokers) {
  const scripts = brokers.map(item => `${item.goal_id} (${item.selection}): ${item.brokerFile}`).join("\n");
  return `World as Prolog terms:\n${item.p1.representation}\n${item.p1.query_term}\nYou may execute from one to three of the following sealed scripts, each at most once, with no arguments, shell prefix, quotes, or other commands:\n${scripts}\nEach output is exactly BROKER_RESULT: entailed or BROKER_RESULT: unknown. These are bounded Horn-chain subproblems, not answers to the whole FOL question. Use them as inputs; interpret quantifiers and every non-Horn construct yourself.\nQuestion: ${item.p0.question}\nAnswer with exactly one line: RESULT: A, RESULT: B, or RESULT: C.\n`;
}
function protectedPaths({ fixtureFile, authFile, swiplPath, invocation }) { return [...new Set([__dirname, fixtureFile, authFile, swiplPath, invocation.private_auth_file, invocation.private_auth_file && path.dirname(invocation.private_auth_file)].filter(Boolean).map(value => path.resolve(value)))]; }
function summarize(fixture, records) {
  if (records.length !== fixture.cases.length) throw new Error("summary requires one record for every fixture case");
  const valid = records.filter(item => item.format_valid && !item.transport_error), correct = valid.filter(item => item.answer === item.source_answer);
  const calls = valid.map(item => item.inspection.tool_events_observed);
  return Object.freeze({ planned: fixture.cases.length, recorded: records.length, protocol_valid: valid.length, protocol_invalid: records.length - valid.length, correct_among_valid: correct.length, accuracy_among_valid: valid.length ? correct.length / valid.length : null, broker_calls_among_valid: { min: calls.length ? Math.min(...calls) : null, max: calls.length ? Math.max(...calls) : null, total: calls.reduce((sum, value) => sum + value, 0) } });
}
async function collectMulticallSubscription({ fixtureFile, rawRoot, model, codexPath, authFile, swiplPath, maxCalls = 3, spawnImpl = childProcess.spawn }) {
  const fixturePath = absoluteFile(fixtureFile, "fixtureFile"), fixtureBytes = fs.readFileSync(fixturePath, "utf8"), fixture = JSON.parse(fixtureBytes); validateFixture(fixture); freshRoot(rawRoot);
  if (typeof model !== "string" || !model.trim()) throw new Error("model is required and must be recorded explicitly");
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 3) throw new Error("maxCalls must be an integer from 1 to 3");
  const codex = absoluteFile(codexPath, "codexPath"), auth = absoluteFile(authFile, "authFile"), swipl = resolveSwiplBinary(swiplPath); if (path.basename(auth) !== "auth.json") throw new Error("authFile must name auth.json");
  const fixtureSha = sha256(fixtureBytes), broker = createBroker(fixture), records = [];
  writeExclusive(path.join(rawRoot, "transport.json"), stable({ transport: "codex-cli-subscription-trace-gated-p2-multicall-v1", api_key: false, condition: "P2_multicall", max_calls: maxCalls, fixture_sha256: fixtureSha, model }));
  for (const item of [...fixture.cases].sort((a, b) => a.case_id.localeCompare(b.case_id))) {
    const run = seatbelt.createFreshSealedRunRoot(rawRoot), brokers = createMulticallBrokers({ run, item, broker, swiplPath: swipl, maxCalls }), prompt = promptFor(item, brokers), sealed = seatbelt.writeSealedInput(run, { prompt, schema: stable(OUTPUT_SCHEMA) });
    let response = null, inspection = null, transportError = null, rawResponse, invocation = null;
    try {
      invocation = seatbelt.buildTraceAuditedInvocation({ run, sealed, codexPath: codex, model, authFile: auth }); const raw = await invokeCodex({ invocation, spawnImpl });
      const parsed = parseMulticallJsonl(raw.stdout_file, { brokerPaths: brokers.map(item => item.brokerFile), maxCalls, prohibitedPaths: protectedPaths({ fixtureFile: fixturePath, authFile: auth, swiplPath: swipl, invocation }), additionalAllowedPaths: brokers.map(item => item.receiptFile) });
      const byPath = new Map(brokers.map(item => [fs.realpathSync(item.brokerFile), item]));
      const receipts = parsed.inspection.broker_actions.map(brokerPath => { const selected = byPath.get(brokerPath); if (!selected) throw new Error("trace broker was not in selected catalog"); return Object.freeze({ status: readBrokerResult(selected.receiptFile), goal_id: selected.goal_id, goal: selected.goal, selection: selected.selection }); });
      response = { answer: parseCodexFinalOutput(raw.final_output_file), usage: parsed.usage, receipts }; inspection = parsed.inspection; rawResponse = raw.final_output_file;
    } catch (error) { transportError = String(error && (error.stack || error.message) || error); rawResponse = path.join(run.output_dir, "collector-rejection.txt"); writeExclusive(rawResponse, transportError + "\n"); }
    finally { discardPrivateAuth(invocation, run); }
    const answer = parse(response && response.answer), record = { record_id: `${item.case_id}-p2-multicall`, case_id: item.case_id, condition: "P2_multicall", fixture_sha256: fixtureSha, prompt_sha256: sha256(prompt), prompt: artifact(rawRoot, sealed.prompt_file), source_answer: item.source_answer, answer, format_valid: Boolean(answer) && !transportError, broker_receipts: response && response.receipts || null, usage: response && response.usage, inspection, raw_response: artifact(rawRoot, rawResponse), raw: { schema: artifact(rawRoot, sealed.schema_file), stdout: artifact(rawRoot, path.join(run.output_dir, "codex-stdout.jsonl")), stderr: artifact(rawRoot, path.join(run.output_dir, "codex-stderr.txt")), final_output: artifact(rawRoot, path.join(run.output_dir, "final-output.txt")) }, transport_error: transportError };
    writeExclusive(path.join(run.output_dir, "record.json"), stable(record)); records.push(Object.freeze(record));
  }
  const result = Object.freeze({ schema_version: "proverqa-hard-codex-p2-multicall-run-v1", cdr_status: "not-a-cdr-receipt", fixture_sha256: fixtureSha, model, max_calls: maxCalls, summary: summarize(fixture, records), records: Object.freeze(records) }); writeExclusive(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), stable(result)); return result;
}
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { const token = argv[i]; if (token === "--allow-codex-subscription") out.allow = true; else if (["--fixture", "--raw-root", "--model", "--codex-path", "--auth-file", "--swipl-path", "--max-calls"].includes(token) && argv[i + 1]) out[{ "--fixture": "fixtureFile", "--raw-root": "rawRoot", "--model": "model", "--codex-path": "codexPath", "--auth-file": "authFile", "--swipl-path": "swiplPath", "--max-calls": "maxCalls" }[token]] = argv[++i]; else throw new Error("usage: --allow-codex-subscription --fixture FILE --raw-root FRESH_DIR --model MODEL --codex-path FILE --auth-file AUTH_JSON [--swipl-path FILE] [--max-calls 1..3]"); } if (!out.allow) throw new Error("a live Codex subscription run requires --allow-codex-subscription"); for (const key of ["fixtureFile", "rawRoot", "model", "codexPath", "authFile"]) if (!out[key]) throw new Error(`missing --${key}`); if (out.maxCalls !== undefined) out.maxCalls = Number(out.maxCalls); return out; }
module.exports = { collectMulticallSubscription, parseArgs, promptFor, summarize };
if (require.main === module) (async () => { const result = await collectMulticallSubscription(parseArgs(process.argv.slice(2))); console.log(JSON.stringify({ status: "collected-not-a-cdr-receipt", records: result.records.length })); })().catch(error => { console.error(`proverqa-hard-multicall-collector: ${error.stack || error.message}`); process.exitCode = 1; });
