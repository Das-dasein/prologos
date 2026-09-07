"use strict";
// Non-scoring observation seam for ordinary agent-authored Prolog.  Unlike a
// later reproducible evaluator, this deliberately accepts the program text as
// written and runs it only as an isolated, untrusted thought.
const crypto = require("node:crypto");
const { createSnapshot, createCandidate, runThought } = require("./cognitive-memory");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function nonempty(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`); return value; }
function outcomeFromTranscript(transcript) {
  const match = typeof transcript === "string" && transcript.match(/^PAM_DIAGNOSTIC_OUTCOME: (.+)$/m);
  if (!match) return "unreported";
  if (match[1] === "succeeded" || match[1] === "failed") return match[1];
  return `error:${match[1]}`;
}

async function runFreePrologDiagnostic({ caseId, program, query, source = "agent", timeoutMs, maxOutputBytes }) {
  nonempty(caseId, "caseId"); nonempty(program, "program"); nonempty(query, "query"); nonempty(source, "source");
  const snapshot = createSnapshot({ id: `free-prolog:${caseId}:empty` });
  const candidate = createCandidate({ id: `free-prolog:${caseId}:candidate`, program, source });
  const result = await runThought({ snapshot, candidate, goal: query, timeoutMs, maxOutputBytes });
  return Object.freeze({
    schema_version: "free-prolog-diagnostic-v1",
    status: "observed-not-scored",
    case_id: caseId,
    program_sha256: sha256(program),
    query_sha256: sha256(query),
    program,
    query,
    runtime: result.runEvidence,
    execution_outcome: outcomeFromTranscript(result.runEvidence.transcript.transcript)
  });
}
module.exports = { outcomeFromTranscript, runFreePrologDiagnostic };
