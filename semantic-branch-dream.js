"use strict";

// A bounded disposable counterfactual runner. It creates full candidates and
// never mutates a submitted baseline or trusted memory.
const crypto = require("node:crypto");
const { checkCandidate, groundGoal } = require("./candidate-checker");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function candidateHash(candidate) { return sha256(`${candidate.program}\n--query--\n${candidate.query}`); }
function statusFromBindings(bindings) {
  const match = typeof bindings === "string" && bindings.match(/^labelled_explanation\(.+?,(entailed|contradicted|unknown|conflict|invalid_program),/);
  return match ? match[1] : "unreported";
}
function cited(sentences, id, quote) { return Array.isArray(sentences) && sentences.some(s => s && s.id === id && typeof s.text === "string" && s.text.includes(quote)); }
function validate(h, baseline, sentences) {
  if (!h || !/^h[1-2]$/.test(h.id || "") || !["connector_interpretation", "predicate_alias", "missing_type_assumption"].includes(h.kind)) throw new Error("invalid hypothesis identity");
  if (!/^s[0-9]+$/.test(h.source_sentence_id || "") || typeof h.source_quote !== "string" || !h.source_quote || !cited(sentences, h.source_sentence_id, h.source_quote)) throw new Error("source quote does not occur in the cited sentence");
  if (!h.candidate || typeof h.candidate.program !== "string" || !h.candidate.program.trim() || !groundGoal(h.candidate.query)) throw new Error("hypothesis must contain a complete ground candidate");
  if (candidateHash(h.candidate) === candidateHash(baseline)) throw new Error("hypothesis candidate must differ from baseline");
}
function makeBranch(_baseline, h) { return { program: h.candidate.program, query: h.candidate.query }; }
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
