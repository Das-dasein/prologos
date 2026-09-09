"use strict";

// This runner is deliberately unable to call a model while the source
// artifacts are drafts.  A later freeze must pin their hashes in the protocol.
// It never reads the scorer-only gold file.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const audit = require("./near-signature-reflection-run");

const DEFAULT_WAVE = ".cdr/waves/luna-thirty-p0-p1-p2-v1";
const ANSWER_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["answer", "reason"],
  properties: {
    answer: { type: "string", enum: ["A", "B", "C"] },
    reason: { type: "string" },
  },
});
const CONDITIONS = Object.freeze(["P0", "P1", "P2"]);
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}
function files(wave = DEFAULT_WAVE) {
  return {
    fixture: path.join(wave, "fixture-draft.json"),
    scorer: path.join(wave, "scorer-only-draft.json"),
    contract: path.join(wave, "answer-contract-draft.md"),
    protocol: path.join(wave, "protocol-draft.json"),
  };
}
function isPermutation(value) {
  return Array.isArray(value) && value.length === CONDITIONS.length && [...value].sort().join(",") === CONDITIONS.join(",");
}
function validateProtocol(fixture, protocol) {
  if (protocol.schema_version !== "luna-thirty-p0-p1-p2-v1") throw Error("protocol_schema_invalid");
  if (protocol.status !== "frozen-before-model-output" || protocol.retry_policy !== "none") throw Error("protocol_not_frozen_no_retry");
  if (protocol.calls_planned !== 18) throw Error("calls_planned_invalid");
  for (const field of ["model", "reasoning_effort", "context_window", "timeout_ms", "fixture_sha256", "answer_contract_sha256", "scorer_sha256"]) {
    if (protocol[field] === undefined || protocol[field] === null || protocol[field] === "") throw Error(`protocol_field_missing:${field}`);
  }
  if (!Array.isArray(fixture.fixture) || fixture.fixture.length !== 6 || !Array.isArray(fixture.ids) || fixture.ids.length !== 6) throw Error("fixture_size_invalid");
  const ids = fixture.fixture.map(item => item.case_id);
  if (new Set(ids).size !== 6 || new Set(fixture.ids).size !== 6 || !fixture.fixture.every(item => fixture.ids.includes(item.source_id))) throw Error("fixture_ids_invalid");
  if (JSON.stringify(Object.keys(protocol.condition_order || {}).sort()) !== JSON.stringify([...ids].sort())) throw Error("condition_order_ids_invalid");
  const orders = Object.values(protocol.condition_order);
  if (!orders.every(isPermutation) || new Set(orders.map(order => order.join(","))).size !== 6) throw Error("condition_orders_not_counterbalanced");
}
function frozenInputs(wave = DEFAULT_WAVE) {
  const source = files(wave);
  const fixtureText = fs.readFileSync(source.fixture, "utf8");
  const scorerText = fs.readFileSync(source.scorer, "utf8");
  const contractText = fs.readFileSync(source.contract, "utf8");
  const protocolText = fs.readFileSync(source.protocol, "utf8");
  const fixture = JSON.parse(fixtureText);
  const protocol = JSON.parse(protocolText);
  if (fixture.status !== "frozen-before-model-output" || JSON.parse(scorerText).status !== "frozen-scorer-only" || sha256(fixtureText) !== protocol.fixture_sha256 || sha256(contractText) !== protocol.answer_contract_sha256 || sha256(scorerText) !== protocol.scorer_sha256) throw Error("frozen_hash_gate_failed");
  validateProtocol(fixture, protocol);
  return { fixture, protocol, contractText, hashes: { fixture: sha256(fixtureText), contract: sha256(contractText), scorer: sha256(scorerText), protocol: sha256(protocolText) } };
}
function p0Prompt(item) {
  return `Answer the original question using only the supplied material. Return exactly one JSON object: { "answer": "A" | "B" | "C", "reason": "..." }. Do not repair, rename, add facts, execute code, or treat a formal certificate as an answer by itself.\n\nOriginal English context:\n${item.context}\n\nOriginal question:\n${item.question}\n\nChoices: A means true; B means false; C means uncertain.`;
}
function p1Suffix(item) {
  return `\n\nFrozen proposed Prolog formalization (do not change it):\nProgram:\n${item.candidate.program}\nQuery:\n${item.candidate.query}`;
}
function evidenceForPrompt(item) {
  const evidence = item.execution_evidence;
  if (typeof evidence !== "string" || !evidence.startsWith("PAM_DIAGNOSTIC_BINDINGS: ") || !evidence.endsWith("\nPAM_DIAGNOSTIC_OUTCOME: succeeded")) throw Error(`execution_evidence_invalid:${item.case_id}`);
  if (/Warning:|\/private\/|trusted-prelude|input\//.test(evidence)) throw Error(`execution_evidence_not_bounded:${item.case_id}`);
  return evidence;
}
function p2Suffix(item) {
  return `\n\nRead-only execution certificate for that same frozen candidate:\n${evidenceForPrompt(item)}`;
}
function prompts(item) {
  const P0 = p0Prompt(item), P1 = `${P0}${p1Suffix(item)}`, P2 = `${P1}${p2Suffix(item)}`;
  if (!P1.startsWith(P0) || !P2.startsWith(P1) || P1.slice(P0.length) !== p1Suffix(item) || P2.slice(P1.length) !== p2Suffix(item)) throw Error(`prompt_delta_invalid:${item.case_id}`);
  return { P0, P1, P2 };
}
function preflight(wave = DEFAULT_WAVE) {
  const inputs = frozenInputs(wave);
  const rows = inputs.fixture.fixture.map(item => {
    if (!item || typeof item.context !== "string" || typeof item.question !== "string" || !item.candidate || typeof item.candidate.program !== "string" || typeof item.candidate.query !== "string") throw Error(`fixture_case_invalid:${item && item.case_id}`);
    const assembled = prompts(item);
    return { case_id: item.case_id, order: inputs.protocol.condition_order[item.case_id], prompt_sha256: Object.fromEntries(CONDITIONS.map(condition => [condition, sha256(assembled[condition])])) };
  });
  return { status: "preflight-passed-no-model-call", hashes: inputs.hashes, rows, calls_planned: 18, gold_read: false };
}
function receiptError(receipt) {
  if (receipt.error) return receipt.error;
  const output = receipt.output;
  if (!output || typeof output !== "object" || Array.isArray(output) || Object.keys(output).sort().join(",") !== "answer,reason" || !["A", "B", "C"].includes(output.answer) || typeof output.reason !== "string") return "output_schema_failed";
  return null;
}
function stop(rawRoot, error, completedCalls) {
  write(path.join(rawRoot, "stopped.json"), { status: "stopped-after-receipt-error-no-retry", error, completed_calls: completedCalls, calls_planned: 18, retry_policy: "none" });
}
function run(rawRoot, wave = DEFAULT_WAVE) {
  if (fs.existsSync(rawRoot)) throw Error("raw_root_must_not_exist_no_resume");
  const inputs = frozenInputs(wave);
  const gate = preflight(wave);
  fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
  write(path.join(rawRoot, "provenance.json"), {
    status: "frozen-p0-p1-p2-answer-pilot",
    fixture_sha256: inputs.hashes.fixture,
    answer_contract_sha256: inputs.hashes.contract,
    protocol_sha256: inputs.hashes.protocol,
    scorer_read_for_hash_only: true,
    scorer_sha256: inputs.hashes.scorer,
    calls_planned: 18,
    retry_policy: "none",
    preflight: gate,
  });
  let completedCalls = 0;
  for (const item of inputs.fixture.fixture) {
    const assembled = prompts(item);
    const calls = [];
    for (const condition of inputs.protocol.condition_order[item.case_id]) {
      const receipt = audit.invoke(assembled[condition], ANSWER_SCHEMA, path.join(rawRoot, item.case_id, condition), inputs.protocol);
      const error = receiptError(receipt);
      calls.push({ condition, receipt, error });
      completedCalls += 1;
      if (error) {
        write(path.join(rawRoot, item.case_id, "record.json"), { case_id: item.case_id, source_id: item.source_id, calls, status: "stopped-after-receipt-error-no-retry" });
        stop(rawRoot, error, completedCalls);
        throw Error(`receipt_gate_failed:${item.case_id}:${condition}:${error}`);
      }
    }
    write(path.join(rawRoot, item.case_id, "record.json"), { case_id: item.case_id, source_id: item.source_id, calls, status: "completed" });
  }
  write(path.join(rawRoot, "completed.json"), { status: "completed-no-retries", calls_completed: completedCalls, calls_planned: 18 });
}

if (require.main === module) {
  if (process.argv[2] === "--run" && process.argv[3]) run(process.argv[3], process.argv[4] || DEFAULT_WAVE);
  else console.log(JSON.stringify(preflight(process.argv[2] || DEFAULT_WAVE), null, 2));
}
module.exports = { ANSWER_SCHEMA, DEFAULT_WAVE, evidenceForPrompt, files, frozenInputs, p0Prompt, p1Suffix, p2Suffix, preflight, prompts, receiptError, run, validateProtocol };
