"use strict";
const assert = require("node:assert/strict");
const { candidateHash, runSemanticBranchDream } = require("./semantic-branch-dream");
(async () => {
  const baseline = { program: "domain(person,[ada]).\naxiom(s1, paints(ada)).\naxiom(s2, or(paints(ada), writes(ada))).\n", query: "writes(ada)" };
  const sentences = [{ id: "s2", text: "Ada either paints or writes; the wording does not say whether both are allowed." }, { id: "s3", text: "Ada receives accolades." }];
  const xorCandidate = { program: "domain(person,[ada]).\naxiom(s1, paints(ada)).\naxiom(s2, xor(paints(ada), writes(ada))).\n", query: "writes(ada)" };
  const trace = await runSemanticBranchDream({ caseId: "xor-sensitivity", baseline, sourceSentences: sentences, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "xor-sensitivity", baseline_candidate_sha256: candidateHash(baseline), hypotheses: [{ id: "h1", kind: "connector_interpretation", source_sentence_id: "s2", source_quote: "either paints or writes", candidate: xorCandidate }] } });
  assert.equal(trace.status, "observed-not-scored"); assert.equal(trace.baseline.semantic_status, "unknown"); assert.equal(trace.branches[0].semantic_status, "contradicted"); assert.equal(trace.conclusion, "branch_dependent");
  const aliasBaseline = { program: "domain(person,[ada]).\naxiom(s3, receive_accolades(ada)).\n", query: "receives_accolades(ada)" };
  const alias = await runSemanticBranchDream({ caseId: "query-alias", baseline: aliasBaseline, sourceSentences: sentences, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "query-alias", baseline_candidate_sha256: candidateHash(aliasBaseline), hypotheses: [{ id: "h1", kind: "predicate_alias", source_sentence_id: "s3", source_quote: "receives accolades", candidate: { program: aliasBaseline.program, query: "receive_accolades(ada)" } }] } });
  assert.equal(alias.baseline.semantic_status, "unknown"); assert.equal(alias.branches[0].semantic_status, "entailed"); assert.equal(alias.conclusion, "branch_dependent");
  const rejected = await runSemanticBranchDream({ caseId: "reject-unsourced", baseline, sourceSentences: sentences, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "reject-unsourced", baseline_candidate_sha256: candidateHash(baseline), hypotheses: [{ id: "h1", kind: "connector_interpretation", source_sentence_id: "s2", source_quote: "not in source", candidate: xorCandidate }] } });
  assert.equal(rejected.branches[0].status, "rejected_hypothesis"); assert.equal(rejected.conclusion, "unresolved");
  const partial = await runSemanticBranchDream({ caseId: "partial-branch", baseline, sourceSentences: sentences, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "partial-branch", baseline_candidate_sha256: candidateHash(baseline), hypotheses: [{ id: "h1", kind: "connector_interpretation", source_sentence_id: "s2", source_quote: "either paints or writes", candidate: xorCandidate }, { id: "h2", kind: "connector_interpretation", source_sentence_id: "s2", source_quote: "not in source", candidate: xorCandidate }] } });
  assert.equal(partial.conclusion, "unresolved");
  console.log("semantic-branch-dream ok: source-cited full-candidate branches stay diagnostic");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
