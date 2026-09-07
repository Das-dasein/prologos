"use strict";

// Codex-subscription transport for the small ProverQA-hard P0/P1/P2 wave.
// It deliberately has no OpenAI API dependency: all model calls are local
// `codex exec` processes. P2 is trace-gated to one sealed, no-argument SWI
// broker action; P0/P1 reject every command or tool event.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");
const { createBroker } = require("./proverqa-hard-hybrid-broker");
const { CONDITIONS, parse, plan } = require("./proverqa-hard-hybrid-collector");
const { invokeCodex, parseCodexFinalOutput, parseCodexJsonl, parseP2CodexJsonl, readBrokerResult, resolveSwiplBinary } = require("./representation-live-evaluator");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const OUTPUT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string" } } });

function absoluteFile(value, label) {
  if (typeof value !== "string" || !path.isAbsolute(value) || !fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error(`${label} must be an existing absolute file`);
  return fs.realpathSync(value);
}
function freshRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value) || fs.existsSync(value) || !fs.statSync(path.dirname(value)).isDirectory()) throw new Error("rawRoot must be a fresh absolute path with an existing parent");
  fs.mkdirSync(value, { mode: 0o700 });
}
function writeExclusive(file, content, mode = 0o600) { fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode }); return file; }
function artifact(root, file) {
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file, "utf8");
  return Object.freeze({ ref: `local://${path.relative(root, file).split(path.sep).join("/")}`, sha256: sha256(bytes) });
}
function p2Prompt(item, brokerPath, selected) {
  return `World as Prolog terms:\n${item.p1.representation}\n${item.p1.query_term}\nA bounded chain subproblem was predeclared as ${selected.goal_id}; it is not an answer to the whole FOL question. You must execute exactly this private script path, with no arguments, shell prefix, quotes, or any other command:\n${brokerPath}\nInterpret quantifiers and every non-Horn construct yourself.\nQuestion: ${item.p0.question}\nAnswer with exactly one line: RESULT: A, RESULT: B, or RESULT: C.\n`;
}
function buildP2Broker(run, item, broker, swiplPath) {
  const selected = broker.predeclaredGoal(item.case_id);
  const programFile = path.join(run.state_dir, "sealed-program.pl"), receiptFile = path.join(run.state_dir, "broker-receipt.txt"), brokerFile = path.join(run.state_dir, "query-broker.sh");
  const compiled = broker.compiledProgram(item.case_id);
  // A Horn projection may keep a rule whose antecedent is absent from the
  // projection (for example because its source formula is non-Horn). In this
  // bounded subproblem, an absent predicate is a failed chain, not a Prolog
  // exception that silently leaves an empty receipt.
  const program = `${compiled}\n:- set_prolog_flag(unknown, fail).\n:- initialization(main).\nmain :- ((${selected.goal}) -> writeln('BROKER_RESULT: entailed') ; writeln('BROKER_RESULT: unknown')), halt.\n`;
  writeExclusive(programFile, program, 0o400);
  const script = `#!/bin/sh\nif [ "$#" -ne 0 ]; then exit 64; fi\nexec ${JSON.stringify(swiplPath)} --quiet --nosignals -s ${JSON.stringify(programFile)} > ${JSON.stringify(receiptFile)}\n`;
  writeExclusive(brokerFile, script, 0o700); fs.chmodSync(brokerFile, 0o700);
  return Object.freeze({ brokerFile, receiptFile, selected });
}
function protectedPaths({ fixtureFile, authFile, swiplPath, invocation }) {
  return [...new Set([__dirname, fixtureFile, authFile, swiplPath, invocation.private_auth_file, invocation.private_auth_file && path.dirname(invocation.private_auth_file)].filter(Boolean).map(value => path.resolve(value)))];
}
function discardPrivateAuth(invocation, run) {
  if (!invocation) return;
  const file = invocation.private_auth_file;
  if (typeof file !== "string" || path.dirname(file) !== run.state_dir || path.basename(file) !== "auth.json") throw new Error("refusing to remove a non-private Codex auth file");
  fs.rmSync(file, { force: true });
}
function validateFixture(fixture) {
  if (!fixture || fixture.schema_version !== "proverqa-hard-hybrid-fixture-v1" || !Array.isArray(fixture.cases) || fixture.cases.length !== 12) throw new Error("expected a validated 12-case ProverQA-hard hybrid fixture");
  for (const item of fixture.cases) if (!item.p0 || !item.p1 || !Array.isArray(item.private_formulas) || !["A", "B", "C"].includes(item.source_answer)) throw new Error(`malformed fixture case ${item && item.case_id}`);
}
async function collectCodexSubscription({ fixtureFile, rawRoot, model, codexPath, authFile, swiplPath, spawnImpl = childProcess.spawn }) {
  const fixturePath = absoluteFile(fixtureFile, "fixtureFile"), fixtureBytes = fs.readFileSync(fixturePath, "utf8"), fixture = JSON.parse(fixtureBytes);
  validateFixture(fixture); freshRoot(rawRoot);
  if (typeof model !== "string" || !model.trim()) throw new Error("model is required and must be recorded explicitly");
  const codex = absoluteFile(codexPath, "codexPath"), auth = absoluteFile(authFile, "authFile"), swipl = resolveSwiplBinary(swiplPath);
  if (path.basename(auth) !== "auth.json") throw new Error("authFile must name auth.json");
  const fixtureSha = sha256(fixtureBytes), broker = createBroker(fixture), records = [];
  writeExclusive(path.join(rawRoot, "transport.json"), stable({ transport: "codex-cli-subscription-trace-gated-v1", api_key: false, conditions: { P0: "no-actions", P1: "no-actions", P2: "exactly-one-sealed-no-argument-broker" }, fixture_sha256: fixtureSha, model }));
  for (const entry of plan(fixture)) {
    const run = seatbelt.createFreshSealedRunRoot(rawRoot), p2 = entry.condition === "P2" ? buildP2Broker(run, entry.case, broker, swipl) : null;
    const prompt = entry.condition === "P0" ? `World:\n${entry.case.p0.context}\nQuestion: ${entry.case.p0.question}\nAnswer with exactly one line: RESULT: A, RESULT: B, or RESULT: C.\n` : entry.condition === "P1" ? `World as Prolog terms:\n${entry.case.p1.representation}\n${entry.case.p1.query_term}\nQuestion: ${entry.case.p0.question}\nAnswer with exactly one line: RESULT: A, RESULT: B, or RESULT: C.\n` : p2Prompt(entry.case, p2.brokerFile, p2.selected);
    const sealed = seatbelt.writeSealedInput(run, { prompt, schema: stable(OUTPUT_SCHEMA) });
    let response = null, inspection = null, transportError = null, rawResponse, invocation = null;
    try {
      invocation = seatbelt.buildTraceAuditedInvocation({ run, sealed, codexPath: codex, model, authFile: auth });
      const raw = await invokeCodex({ invocation, spawnImpl });
      const parsed = entry.condition === "P2" ? parseP2CodexJsonl(raw.stdout_file, protectedPaths({ fixtureFile: fixturePath, authFile: auth, swiplPath: swipl, invocation }), p2.brokerFile) : parseCodexJsonl(raw.stdout_file, protectedPaths({ fixtureFile: fixturePath, authFile: auth, swiplPath: swipl, invocation }));
      const receipt = entry.condition === "P2" ? readBrokerResult(p2.receiptFile) : null;
      response = { answer: parseCodexFinalOutput(raw.final_output_file), usage: parsed.usage, receipt };
      inspection = parsed.inspection; rawResponse = raw.final_output_file;
    } catch (error) {
      transportError = String(error && (error.stack || error.message) || error);
      rawResponse = path.join(run.output_dir, "collector-rejection.txt"); writeExclusive(rawResponse, transportError + "\n");
    } finally { discardPrivateAuth(invocation, run); }
    const answer = parse(response && response.answer);
    const record = { record_id: `${entry.case.case_id}-${entry.condition.toLowerCase()}`, case_id: entry.case.case_id, condition: entry.condition, fixture_sha256: fixtureSha, prompt_sha256: sha256(prompt), prompt: artifact(rawRoot, sealed.prompt_file), source_answer: entry.case.source_answer, answer, format_valid: Boolean(answer), broker_receipt: response && response.receipt ? { status: response.receipt, goal_id: p2.selected.goal_id, goal: p2.selected.goal, selection: p2.selected.selection } : null, usage: response && response.usage, inspection, raw_response: artifact(rawRoot, rawResponse), raw: { schema: artifact(rawRoot, sealed.schema_file), stdout: artifact(rawRoot, path.join(run.output_dir, "codex-stdout.jsonl")), stderr: artifact(rawRoot, path.join(run.output_dir, "codex-stderr.txt")), final_output: artifact(rawRoot, path.join(run.output_dir, "final-output.txt")) }, transport_error: transportError };
    writeExclusive(path.join(run.output_dir, "record.json"), stable(record)); records.push(Object.freeze(record));
  }
  const result = Object.freeze({ schema_version: "proverqa-hard-codex-subscription-run-v1", cdr_status: "not-a-cdr-receipt", fixture_sha256: fixtureSha, model, records: Object.freeze(records) });
  writeExclusive(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), stable(result));
  return result;
}
function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) { const token = argv[index]; if (token === "--allow-codex-subscription") out.allow = true; else if (["--fixture", "--raw-root", "--model", "--codex-path", "--auth-file", "--swipl-path"].includes(token) && argv[index + 1]) out[{ "--fixture": "fixtureFile", "--raw-root": "rawRoot", "--model": "model", "--codex-path": "codexPath", "--auth-file": "authFile", "--swipl-path": "swiplPath" }[token]] = argv[++index]; else throw new Error("usage: --allow-codex-subscription --fixture FILE --raw-root FRESH_DIR --model MODEL --codex-path FILE --auth-file AUTH_JSON [--swipl-path FILE]"); }
  if (!out.allow) throw new Error("a live Codex subscription run requires --allow-codex-subscription");
  for (const key of ["fixtureFile", "rawRoot", "model", "codexPath", "authFile"]) if (!out[key]) throw new Error(`missing --${key.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`)}`);
  return out;
}
module.exports = { buildP2Broker, collectCodexSubscription, discardPrivateAuth, parseArgs, p2Prompt, validateFixture };
if (require.main === module) {
  (async () => { const options = parseArgs(process.argv.slice(2)); const result = await collectCodexSubscription(options); console.log(JSON.stringify({ status: "collected-not-a-cdr-receipt", records: result.records.length })); })().catch(error => { console.error(`proverqa-hard-codex-collector: ${error.stack || error.message}`); process.exitCode = 1; });
}
