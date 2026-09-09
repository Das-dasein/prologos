"use strict";

// This is intentionally a separate, post-execution scorer.  The executor
// runner never reads this file or any gold value.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const json = value => JSON.stringify(value, null, 2) + "\n";
const write = (file, value) => fs.writeFileSync(file, json(value), { flag: "wx", mode: 0o600 });

function score({ executionRoot, scorerFile, outputFile }) {
  const execution = JSON.parse(fs.readFileSync(path.join(executionRoot, "results-unscored.json"), "utf8"));
  const scorerText = fs.readFileSync(scorerFile, "utf8");
  const gold = JSON.parse(scorerText);
  if (execution.status !== "completed-unscored-prolog-answer-reexecution" || execution.planned !== 30 || execution.completed !== 30 || execution.resolved !== 29) throw Error("unscored_execution_not_complete");
  const ids = Object.keys(execution.answers).map(Number).sort((a, b) => a - b);
  if (ids.length !== 30 || ids.some(id => !["A", "B", "C"].includes(gold[id]))) throw Error("scorer_does_not_cover_execution");
  const rows = ids.map(source_id => ({ source_id, answer: execution.answers[source_id], gold: gold[source_id], correct: execution.answers[source_id] === gold[source_id] }));
  const correct = rows.filter(row => row.correct).length;
  const resolved = rows.filter(row => row.answer !== null);
  const result = {
    status: "post_execution_scored_development_result",
    execution_results_sha256: sha256(fs.readFileSync(path.join(executionRoot, "results-unscored.json"), "utf8")),
    scorer_sha256: sha256(scorerText),
    planned: rows.length,
    resolved: resolved.length,
    unresolved: rows.filter(row => row.answer === null).map(row => row.source_id),
    correct,
    accuracy_all_planned: correct / rows.length,
    accuracy_resolved: correct / resolved.length,
    rows
  };
  write(outputFile, result);
  return result;
}

if (require.main === module) {
  const executionRoot = path.join(__dirname, ".cdr", "waves", "luna-thirty-prolog-answer-v1", "raw-prolog-answer-v1");
  const scorerFile = path.join(__dirname, ".cdr", "waves", "luna-thirty-paired-v1", "scorer-only.json");
  const outputFile = path.join(executionRoot, "results-scored.json");
  try { process.stdout.write(json(score({ executionRoot, scorerFile, outputFile }))); } catch (error) { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; }
}

module.exports = { score };
