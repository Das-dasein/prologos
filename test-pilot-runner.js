"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runPilot, runPilotAggregate, goldProvider, checkQuery, normalizeAnswers, ANSWER_PROMPT_TEMPLATE } = require("./pilot-runner");
const { sha256, PROMPT_TEMPLATE } = require("./live-extraction-harness");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { scoreCandidateArtifact } = require("./cdr-matrix-harness");

const datasetFile = ".cdr/datasets/dialogues-pilot-v1.jsonl";
const oracleFile = ".cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json";
const baseConfig = JSON.parse(fs.readFileSync(".cdr/results/prolog-memory-eval-v0/pilot-config-v2.json"));
const cases = fs.readFileSync(datasetFile, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const config = { ...baseConfig, extraction_prompt_sha256: sha256(PROMPT_TEMPLATE), answer_prompt_sha256: sha256(ANSWER_PROMPT_TEMPLATE) };
const options = condition => ({ config, datasetFile, oracleFile, provider: goldProvider(cases), condition });

(async () => {
  const artifacts = {};
  for (const condition of ["B1", "B2", "B3", "B4"]) {
    const calls = { extract: 0, answer: 0 };
    const provider = goldProvider(cases);
    const extract = provider.extract; const answer = provider.answer;
    provider.extract = async args => { calls.extract += 1; return extract(args); };
    provider.answer = async args => { calls.answer += 1; return answer(args); };
    artifacts[condition] = await runPilot({ ...options(condition), provider });
    assert.equal(calls.extract, 36);
    assert.equal(calls.answer, 12);
    assert.equal(artifacts[condition].schema_version, "prolog-memory-pilot-v2");
    assert.equal(artifacts[condition].case_count, 12);
    assert.equal(artifacts[condition].records.length, 12);
    assert.equal(artifacts[condition].budget.equal, true);
    assert.equal(artifacts[condition].budget.measured_values.length, 12 * (3 + 2 + 1));
    assert.equal(artifacts[condition].matrixB[condition].answer_exact.numerator, 12);
    assert.equal(artifacts[condition].records[0].answer_request.usage.effective_context_budget_tokens, config.effective_context_budget_tokens);
    assert.ok(artifacts[condition].records[0].turn_outputs[0].raw_output_ref.value);
    assert.ok(artifacts[condition].records[0].memory_context.sha256);
    assert.ok(Array.isArray(artifacts[condition].records[0].source_claim_ids));
  }
  assert.deepEqual([artifacts.B1.records[0].memory_context.kind, artifacts.B2.records[0].memory_context.kind, artifacts.B3.records[0].memory_context.kind, artifacts.B4.records[0].memory_context.kind], ["recent_turns", "rolling_summary", "typed_claims_no_prolog", "typed_claims_plus_prolog"]);
  assert.notEqual(artifacts.B1.records[0].memory_context.sha256, artifacts.B2.records[0].memory_context.sha256);
  assert.notEqual(artifacts.B2.records[0].memory_context.sha256, artifacts.B3.records[0].memory_context.sha256);
  assert.equal(artifacts.B3.records.reduce((sum, record) => sum + record.prolog_calls, 0), 0);
  assert.equal(artifacts.B4.records.reduce((sum, record) => sum + record.prolog_calls, 0), 12);

  const aggregate1 = await runPilotAggregate({ config, datasetFile, oracleFile, provider: goldProvider(cases) });
  const aggregate2 = await runPilotAggregate({ config, datasetFile, oracleFile, provider: goldProvider(cases) });
  assert.equal(JSON.stringify(aggregate1), JSON.stringify(aggregate2));
  assert.equal(aggregate1.conditions.length, 4);
  assert.equal(aggregate1.measured_effective_context_budget_tokens, config.effective_context_budget_tokens);
  assert.equal(aggregate1.selected_strongest_non_prolog_baseline, null);
  const candidateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-r2-candidate-")), "aggregate.json");
  fs.writeFileSync(candidateFile, `${JSON.stringify(aggregate1)}\n`);
  assert.equal(scoreCandidateArtifact(candidateFile).matrixB.B4.answer_exact.rate, 1);

  const b5 = await runPilot(options("B5"));
  assert.equal(b5.evidence_boundary, "gold_oracle");
  assert.equal(b5.matrixB.B5.status, "gold_oracle");
  assert.equal(b5.records.length, 12);
  assert.throws(() => checkQuery("assert(foo)."), { code: "UNSAFE_QUERY" });
  assert.doesNotThrow(() => checkQuery("active_assertion_record(_,_,_,_,_,_,_)."));
  assert.deepEqual(normalizeAnswers(["Id = c, X = y"]), ["Id=c,X=y"]);

  const unequalProvider = goldProvider(cases);
  const originalAnswer = unequalProvider.answer;
  unequalProvider.answer = async args => { const response = await originalAnswer(args); if (args.case_id === "stable-01") response.effective_context_budget_tokens += 1; return response; };
  await assert.rejects(() => runPilot({ ...options("B1"), provider: unequalProvider }), { code: "BUDGET_MISMATCH" });

  const missingRaw = goldProvider(cases);
  const originalExtract = missingRaw.extract;
  missingRaw.extract = async args => { const response = await originalExtract(args); delete response.raw_output; return response; };
  await assert.rejects(() => runPilot({ ...options("B1"), provider: missingRaw }), { code: "RAW_OUTPUT_MISSING" });

  const leakedFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-r2-leak-")), "dataset.jsonl");
  const leakedCase = { ...cases[0], dialogue: [{ ...cases[0].dialogue[0], text: "private-marker c_stable_01_a" }, ...cases[0].dialogue.slice(1)] };
  fs.writeFileSync(leakedFile, `${JSON.stringify(leakedCase)}\n`);
  await assert.rejects(() => runPilot({ ...options("B1"), datasetFile: leakedFile, config: { ...config, dataset_sha256: sha256(fs.readFileSync(leakedFile)) } }), { code: "DATASET_CASE_COUNT" });

  const trustedFailure = { ...config, trusted_memory_sha256: "0".repeat(64) };
  await assert.rejects(() => runPilot({ ...options("B1"), config: trustedFailure }), { code: "TRUSTED_HASH_MISMATCH" });
  const missingAnswer = goldProvider(cases); delete missingAnswer.answer;
  await assert.rejects(() => runPilot({ ...options("B1"), provider: missingAnswer }), { code: "CONFIG" });
  assert.equal(ACTIVE_ONTOLOGY.identity.name, "prologos_agent_memory");
  console.log("pilot-runner ok: v2 condition paths, answer calls, budget, provenance and fail-closed gates");
})().catch(error => { console.error(error); process.exitCode = 1; });
