"use strict";

// Offline-testable collection seam for the ProverQA P0/P1/P2-hybrid wave.
// A real transport may implement `complete`; only P2 receives the bounded
// broker object, and only its one receipt is retained outside model prompts.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createBroker } = require("./proverqa-hard-hybrid-broker");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const CONDITIONS = Object.freeze(["P0", "P1", "P2"]);
const ANSWER = "Answer with exactly one line: RESULT: A, RESULT: B, or RESULT: C.\n";

function promptFor(item, condition) {
  const common = `You must decide whether the stated question is true, false, or uncertain.\nQuestion: ${item.p0.question}\n${ANSWER}`;
  if (condition === "P0") return `World:\n${item.p0.context}\n${common}`;
  if (condition === "P1") return `World as Prolog terms:\n${item.p1.representation}\n${item.p1.query_term}\n${common}`;
  if (condition === "P2") return `World as Prolog terms:\n${item.p1.representation}\n${item.p1.query_term}\nA bounded chain broker is available. You may make at most one call using a case id and one listed goal id; it cannot answer the whole FOL question for you.\n${common}`;
  throw new Error("unknown condition");
}
function parse(answer) { const match = typeof answer === "string" && answer.match(/^RESULT: ([ABC])\n?$/); return match ? match[1] : null; }
function plan(fixture) {
  const cases = [...fixture.cases].sort((left, right) => left.case_id.localeCompare(right.case_id));
  return Object.freeze(cases.flatMap(item => CONDITIONS.map(condition => Object.freeze({ case: item, condition }))));
}
function requireFresh(root) { if (!path.isAbsolute(root) || fs.existsSync(root)) throw new Error("rawRoot must be a fresh absolute path"); fs.mkdirSync(root, { recursive: true, mode: 0o700 }); }
async function collect({ fixture, rawRoot, provider }) {
  if (!fixture || !Array.isArray(fixture.cases) || typeof provider?.complete !== "function") throw new Error("fixture and provider.complete are required");
  requireFresh(rawRoot);
  const broker = createBroker(fixture), records = [];
  for (const item of plan(fixture)) {
    const prompt = promptFor(item.case, item.condition);
    if (item.condition !== "P2" && /broker|tool/i.test(prompt)) throw new Error("P0/P1 prompt leaked broker surface");
    const result = await provider.complete({ condition: item.condition, caseId: item.case.case_id, prompt, broker: item.condition === "P2" ? broker : undefined });
    if (!result || typeof result.answer !== "string") throw new Error("provider returned no answer");
    const receipt = result.broker_receipt || null;
    if (item.condition === "P2" && receipt && receipt.case_id !== item.case.case_id) throw new Error("broker receipt bound to another case");
    if (item.condition !== "P2" && receipt) throw new Error("P0/P1 must not produce a broker receipt");
    const rawFile = path.join(rawRoot, `${item.case.case_id}-${item.condition}.json`);
    const raw = stable({ answer: result.answer, usage: result.usage || null, broker_receipt: receipt });
    fs.writeFileSync(rawFile, raw, { encoding: "utf8", flag: "wx", mode: 0o600 });
    records.push(Object.freeze({ case_id: item.case.case_id, condition: item.condition, prompt_sha256: sha256(prompt), source_answer: item.case.source_answer, answer: parse(result.answer), format_valid: Boolean(parse(result.answer)), broker_receipt: receipt, raw_sha256: sha256(raw) }));
  }
  return Object.freeze({ schema_version: "proverqa-hard-hybrid-collection-v1", records: Object.freeze(records), raw_root: rawRoot });
}
module.exports = { CONDITIONS, collect, parse, plan, promptFor };
