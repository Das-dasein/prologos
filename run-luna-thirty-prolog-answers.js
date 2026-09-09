"use strict";

// Re-executes frozen Luna30 candidates only.  It deliberately does not read
// scorer-only.json: model-authored programs and queries go into Prolog, where
// diagnostic_query_answer/3 returns the benchmark label.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const json = value => JSON.stringify(value, null, 2) + "\n";
const write = (file, value) => fs.writeFileSync(file, json(value), { flag: "wx", mode: 0o600 });

function answerFromTranscript(transcript) {
  const match = String(transcript || "").match(/^PAM_DIAGNOSTIC_BINDINGS: diagnostic_query_answer\([\s\S]*?,answer\('([ABC])'\),/m);
  return match ? match[1] : null;
}

function benchmarkQuery(savedQuery) {
  if (typeof savedQuery !== "string" || !savedQuery.trim()) throw Error("missing_saved_query");
  return `diagnostic_query_answer(${savedQuery}, Answer, Package)`;
}

function loadCandidates(sourceRoot) {
  const result = JSON.parse(fs.readFileSync(path.join(sourceRoot, "results.json"), "utf8"));
  if (result.status !== "completed-diagnostic-not-independent-cdr-review" || !Array.isArray(result.records) || result.records.length !== 30) throw Error("unexpected_frozen_source_results");
  const candidates = result.records.map(summary => {
    const record = JSON.parse(fs.readFileSync(path.join(sourceRoot, summary.record), "utf8"));
    const observation = record.execution?.observation;
    if (record.source_id !== summary.source_id || !observation || observation.execution_outcome !== "succeeded") throw Error(`unusable_candidate_${summary.source_id}`);
    if (sha256(observation.program) !== record.shared_program_sha256 || sha256(observation.query) !== observation.query_sha256) throw Error(`candidate_hash_mismatch_${summary.source_id}`);
    return { source_id: record.source_id, program: observation.program, query: observation.query, program_sha256: record.shared_program_sha256, query_sha256: observation.query_sha256 };
  });
  if (new Set(candidates.map(candidate => candidate.source_id)).size !== 30) throw Error("nonunique_source_ids");
  return candidates.sort((left, right) => left.source_id - right.source_id);
}

async function run({ sourceRoot, outputRoot, execute = runFreePrologDiagnostic }) {
  if (fs.existsSync(outputRoot)) throw Error("output_root_must_not_exist_no_resume");
  const candidates = loadCandidates(sourceRoot);
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  write(path.join(outputRoot, "provenance.json"), {
    status: "frozen-candidate-reexecution-without-model-or-scorer",
    source_root: path.resolve(sourceRoot),
    source_results_sha256: sha256(fs.readFileSync(path.join(sourceRoot, "results.json"), "utf8")),
    candidate_count: candidates.length,
    scorer_read: false,
    model_calls: 0,
    answer_boundary: "finite_fol_meta_prover:diagnostic_query_answer/3"
  });
  const records = [];
  for (const candidate of candidates) {
    const observation = await execute({
      caseId: `luna-thirty-prolog-answer-${candidate.source_id}`,
      program: candidate.program,
      query: benchmarkQuery(candidate.query),
      source: "frozen-luna-thirty-candidate",
      timeoutMs: 4000,
      maxOutputBytes: 262144
    });
    const transcript = observation.runtime?.transcript?.transcript || "";
    const answer = observation.execution_outcome === "succeeded" ? answerFromTranscript(transcript) : null;
    const record = { ...candidate, benchmark_query_sha256: sha256(observation.query), execution_outcome: observation.execution_outcome, answer, observation };
    records.push(record);
    write(path.join(outputRoot, `case-${candidate.source_id}.json`), record);
    process.stdout.write(`${JSON.stringify({ source_id: candidate.source_id, answer, execution_outcome: observation.execution_outcome })}\n`);
  }
  const summary = {
    status: "completed-unscored-prolog-answer-reexecution",
    planned: candidates.length,
    completed: records.length,
    answers: Object.fromEntries(records.map(record => [record.source_id, record.answer])),
    resolved: records.filter(record => record.answer !== null).length,
    unresolved: records.filter(record => record.answer === null).map(record => record.source_id)
  };
  write(path.join(outputRoot, "results-unscored.json"), summary);
  return summary;
}

if (require.main === module) {
  const wave = path.join(__dirname, ".cdr", "waves", "luna-thirty-paired-v1", "raw-r1-verdicts");
  const output = process.argv[2] || path.join(__dirname, ".cdr", "waves", "luna-thirty-prolog-answer-v1", "raw-prolog-answer-v1");
  run({ sourceRoot: wave, outputRoot: path.resolve(output) }).then(summary => process.stdout.write(json(summary))).catch(error => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
}

module.exports = { answerFromTranscript, benchmarkQuery, loadCandidates, run };
