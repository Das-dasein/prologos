"use strict";
// Semantic check for hosts where the product sandbox wrapper itself is denied.
// It does not replace test-semantic-branch-dream.js in a normal environment.
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { candidateHash, runSemanticBranchDream } = require("./semantic-branch-dream");
const swipl = process.env.SWIPL_BIN || "/opt/homebrew/bin/swipl";

async function directExecutor(_caseId, candidate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sbd-direct-"));
  const file = path.join(root, "candidate.pl");
  const trusted = path.join(__dirname, "finite-fol-meta-prover.pl").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  const source = `:- use_module('${trusted}').\n${candidate.program}\n:- initialization((labelled_explanation(${candidate.query}, Status, _), writeln(Status), halt)).\n`;
  try {
    fs.writeFileSync(file, source, "utf8");
    const run = childProcess.spawnSync(swipl, ["--quiet", "-s", file], { encoding: "utf8", timeout: 4000 });
    if (run.error) throw run.error;
    return { candidate_sha256: candidateHash(candidate), execution_outcome: run.status === 0 ? "succeeded" : "failed", semantic_status: run.status === 0 ? run.stdout.trim() : "unreported", bindings: run.stdout, transcript: `${run.stdout}${run.stderr}` };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

(async () => {
  if (!fs.existsSync(swipl)) { console.log("semantic-branch-dream direct skipped: SWI-Prolog unavailable"); return; }
  const baseline = { program: "domain(person,[ada]).\naxiom(s1, paints(ada)).\naxiom(s2, or(paints(ada), writes(ada))).\n", query: "writes(ada)" };
  const sentences = [{ id: "s2", text: "Ada either paints or writes; the wording does not say whether both are allowed." }, { id: "s3", text: "Ada receives accolades." }];
  const trace = await runSemanticBranchDream({ caseId: "xor-sensitivity", baseline, sourceSentences: sentences, executeCandidate: directExecutor, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "xor-sensitivity", baseline_candidate_sha256: candidateHash(baseline), hypotheses: [{ id: "h1", kind: "connector_interpretation", source_sentence_id: "s2", source_quote: "either paints or writes", candidate: { program: "domain(person,[ada]).\naxiom(s1, paints(ada)).\naxiom(s2, xor(paints(ada), writes(ada))).\n", query: "writes(ada)" } }] } });
  assert.equal(trace.baseline.semantic_status, "unknown"); assert.equal(trace.branches[0].semantic_status, "contradicted"); assert.equal(trace.conclusion, "branch_dependent");
  const aliasBaseline = { program: "domain(person,[ada]).\naxiom(s3, receive_accolades(ada)).\n", query: "receives_accolades(ada)" };
  const alias = await runSemanticBranchDream({ caseId: "query-alias", baseline: aliasBaseline, sourceSentences: sentences, executeCandidate: directExecutor, hypothesisSet: { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: "query-alias", baseline_candidate_sha256: candidateHash(aliasBaseline), hypotheses: [{ id: "h1", kind: "predicate_alias", source_sentence_id: "s3", source_quote: "receives accolades", candidate: { program: aliasBaseline.program, query: "receive_accolades(ada)" } }] } });
  assert.equal(alias.baseline.semantic_status, "unknown"); assert.equal(alias.branches[0].semantic_status, "entailed"); assert.equal(alias.conclusion, "branch_dependent");
  console.log("semantic-branch-dream direct ok: OR/XOR and alias branches change only disposable candidates");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
