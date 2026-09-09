"use strict";

// A bounded disposable counterfactual runner. It creates full candidates and
// never mutates a submitted baseline or trusted memory.
const crypto = require("node:crypto");
const { checkCandidate, groundGoal } = require("./candidate-checker");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const identifier = /^[a-z][a-z0-9_]*$/;

function candidateHash(candidate) { return sha256(`${candidate.program}\n--query--\n${candidate.query}`); }
function statusFromBindings(bindings) {
  const match = typeof bindings === "string" && bindings.match(/^labelled_explanation\(.+?,(entailed|contradicted|unknown|conflict|invalid_program),/);
  return match ? match[1] : "unreported";
}
function cited(sentences, id, quote) { return Array.isArray(sentences) && sentences.some(s => s && s.id === id && typeof s.text === "string" && s.text.includes(quote)); }
function axiomSpan(program, id) {
  const marker = `axiom(${id},`, start = program.indexOf(marker);
  if (start < 0 || program.indexOf(marker, start + marker.length) >= 0) throw new Error(`source axiom ${id} must occur exactly once`);
  let depth = 0;
  for (let i = start; i < program.length; i += 1) { if (program[i] === "(") depth += 1; if (program[i] === ")") depth -= 1; if (program[i] === "." && depth === 0) return { start, end: i + 1, text: program.slice(start, i + 1) }; }
  throw new Error(`source axiom ${id} is incomplete`);
}
function replaceOnce(text, from, to, label) { const at = text.indexOf(from); if (at < 0 || text.indexOf(from, at + from.length) >= 0) throw new Error(`${label} must occur exactly once`); return text.slice(0, at) + to + text.slice(at + from.length); }
function aliasQuery(query, from, to) {
  const needle = `${from}(`, at = query.indexOf(needle);
  if (at < 0 || query.indexOf(needle, at + needle.length) >= 0) throw new Error("query predicate must occur exactly once");
  const changed = query.slice(0, at) + `${to}(` + query.slice(at + needle.length);
  if (!groundGoal(changed)) throw new Error("alias produced an invalid ground query");
  return changed;
}
function validate(h, baseline, sentences) {
  if (!h || !/^h[1-2]$/.test(h.id || "") || !["connector_interpretation", "predicate_alias", "missing_type_assumption"].includes(h.kind)) throw new Error("invalid hypothesis identity");
  if (!/^s[0-9]+$/.test(h.source_sentence_id || "") || typeof h.source_quote !== "string" || !h.source_quote || !cited(sentences, h.source_sentence_id, h.source_quote)) throw new Error("source quote does not occur in the cited sentence");
  const o = h.operation || {};
  if (h.kind === "connector_interpretation" && !(o.kind === "replace_connector" && ["or", "xor"].includes(o.from) && ["or", "xor"].includes(o.to) && o.from !== o.to)) throw new Error("invalid connector operation");
  if (h.kind === "predicate_alias" && !(o.kind === "replace_query_predicate" && o.arity === 1 && identifier.test(o.from_predicate || "") && identifier.test(o.to_predicate || "") && o.from_predicate !== o.to_predicate && baseline.program.includes(`${o.to_predicate}(`))) throw new Error("invalid query alias operation");
  if (h.kind === "missing_type_assumption" && !(o.kind === "add_type_fact" && identifier.test(o.predicate || "") && identifier.test(o.constant || ""))) throw new Error("invalid type-fact operation");
}
function makeBranch(baseline, h) {
  const o = h.operation;
  if (h.kind === "connector_interpretation") { const span = axiomSpan(baseline.program, h.source_sentence_id), changed = replaceOnce(span.text, `${o.from}(`, `${o.to}(`, `${o.from}( in ${h.source_sentence_id}`); return { program: baseline.program.slice(0, span.start) + changed + baseline.program.slice(span.end), query: baseline.query }; }
  if (h.kind === "predicate_alias") return { program: baseline.program, query: aliasQuery(baseline.query, o.from_predicate, o.to_predicate) };
  return { program: `${baseline.program.trimEnd()}\naxiom(dream_${h.id}, ${o.predicate}(${o.constant})).\n`, query: baseline.query };
}
async function execute(caseId, candidate, timeoutMs, maxOutputBytes) {
  const checked = await checkCandidate({ caseId, ...candidate, timeoutMs, maxOutputBytes });
  return { candidate_sha256: candidateHash(candidate), execution_outcome: checked.execution_outcome, semantic_status: statusFromBindings(checked.bindings), bindings: checked.bindings, transcript: checked.transcript };
}
async function runSemanticBranchDream({ caseId, baseline, hypothesisSet, sourceSentences, timeoutMs = 4000, maxOutputBytes = 262144, executeCandidate = execute }) {
  if (!caseId || !baseline || typeof baseline.program !== "string" || !groundGoal(baseline.query)) throw new Error("case_id and ground baseline candidate required");
  if (!hypothesisSet || hypothesisSet.schema_version !== "semantic-branch-dream-hypothesis-v1" || hypothesisSet.case_id !== caseId || hypothesisSet.baseline_candidate_sha256 !== candidateHash(baseline) || !Array.isArray(hypothesisSet.hypotheses) || hypothesisSet.hypotheses.length > 2) throw new Error("invalid hypothesis set identity or bounds");
  if (typeof executeCandidate !== "function") throw new Error("executeCandidate must be a function");
  const baselineResult = await executeCandidate(`${caseId}:baseline`, baseline, timeoutMs, maxOutputBytes), branches = [];
  for (const h of hypothesisSet.hypotheses) try { validate(h, baseline, sourceSentences); const execution = await executeCandidate(`${caseId}:${h.id}`, makeBranch(baseline, h), timeoutMs, maxOutputBytes); branches.push({ id: h.id, kind: h.kind, hypothesis: h, ...execution }); } catch (error) { branches.push({ id: h && h.id || "invalid", kind: h && h.kind || "invalid", status: "rejected_hypothesis", rejection: String(error.message || error) }); }
  const executable = branches.filter(b => !b.rejection && b.execution_outcome === "succeeded" && b.semantic_status !== "unreported");
  const conclusion = baselineResult.execution_outcome !== "succeeded" || baselineResult.semantic_status === "unreported" || executable.length === 0 ? "unresolved" : executable.some(b => b.semantic_status !== baselineResult.semantic_status) ? "branch_dependent" : "stable";
  return Object.freeze({ schema_version: "dream-trace-v1", status: "observed-not-scored", case_id: caseId, baseline: baselineResult, branches, conclusion });
}
module.exports = { candidateHash, makeBranch, runSemanticBranchDream, statusFromBindings, validate };
