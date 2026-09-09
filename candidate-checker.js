"use strict";
const crypto = require("node:crypto");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function groundGoal(value) { if (typeof value !== "string") return false; if (/^[a-z][a-z0-9_]*\([a-z][a-z0-9_]*\)$/.test(value)) return true; if (!value.startsWith("not(") || !value.endsWith(")")) return false; let depth = 0; for (let index = 3; index < value.length; index += 1) { if (value[index] === "(") depth += 1; if (value[index] === ")") depth -= 1; if (depth === 0 && index !== value.length - 1) return false; if (depth < 0) return false; } return depth === 0 && groundGoal(value.slice(4, -1)); }
function binding(transcript) { const match = typeof transcript === "string" && transcript.match(/^PAM_DIAGNOSTIC_BINDINGS: (.+)$/m); return match ? match[1] : null; }
async function checkCandidate({ caseId, program, query, timeoutMs = 4000, maxOutputBytes = 262144 }) {
  if (typeof caseId !== "string" || !caseId) throw new Error("caseId required");
  if (typeof program !== "string" || !program.trim()) throw new Error("program required");
  if (!groundGoal(query)) throw new Error("query must be one lowercase ground unary Prolog term without a final period; constants are lowercase atoms, not variables");
  const diagnosticQuery = `labelled_explanation(${query}, Status, Explanation), audit_proof_tree(${query}, Tree)`;
  const observation = await runFreePrologDiagnostic({ caseId, program, query: diagnosticQuery, source: "immutable-candidate", timeoutMs, maxOutputBytes });
  const result = { schema_version: "candidate-check-v1", candidate_sha256: sha256(`${program}\n--query--\n${query}`), query, program, execution_outcome: observation.execution_outcome, bindings: binding(observation.runtime.transcript.transcript), transcript: observation.runtime.transcript.transcript };
  return Object.freeze(result);
}
module.exports = { checkCandidate, groundGoal };
