#!/usr/bin/env node
"use strict";

// Verifies one immutable eligible-dream report against its retained evidence.
// It does not call a provider. Re-scoring uses the retained harness, so later
// policy repairs do not rewrite the historical measurement.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const CurrentH = require("./harness.cjs");

const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const root = path.resolve(__dirname, "../..");
const defaultReport = path.join(root, "reports/paired-biographies-v1/luna-dream-eligible-v1");
const reportDirectory = path.resolve(process.argv[2] || defaultReport);

async function main() {
  const report = JSON.parse(fs.readFileSync(path.join(reportDirectory, "report.json"), "utf8"));
  const harnessSource = report.sources.find(source => source.file === "world/paired-biographies/harness.cjs");
  assert.ok(harnessSource, "retained harness source required");
  const H = require(path.join(reportDirectory, harnessSource.snapshot));
  assert.equal(report.version, "paired-harness-v3");
  assert.equal(report.status, "completed");
  assert.equal(report.config.model, "gpt-5.6-luna");
  assert.equal(report.dream.status, "completed");
  assert.deepEqual(report.dream.summary, {
    mode: H.DREAM_MODE, eligible: 5, attempted: 5, not_run: 0, correct: 3, total: 5
  });
  for (const source of report.sources) {
    const retained = fs.readFileSync(path.join(reportDirectory, source.snapshot));
    assert.equal(sha(retained), source.sha256, `retained source hash: ${source.file}`);
  }
  const dataset = await CurrentH.loadDataset();
  assert.equal(report.dataset_sha256, dataset.dataset_sha256);
  assert.equal(report.schema_sha256, dataset.schema_sha256);
  const cases = new Map(dataset.rows.map(row => [row.case_id, row]));
  const seen = new Set();
  for (const row of report.dream.behavior) {
    assert.ok(!seen.has(row.case_id), `duplicate case: ${row.case_id}`); seen.add(row.case_id);
    const c = cases.get(row.case_id); assert.ok(c?.dream_eligibility.eligible, `not an eligible dream case: ${row.case_id}`);
    const replayPath = path.join(reportDirectory, "dream/memory", row.case_id, "memory-check.json");
    const replay = JSON.parse(fs.readFileSync(replayPath, "utf8"));
    assert.equal(replay.strategy, "dream"); assert.equal(replay.decision.kind, "ask");
    const evidencePath = path.join(reportDirectory, row.evidence);
    const evidenceBytes = fs.readFileSync(evidencePath), evidence = JSON.parse(evidenceBytes);
    assert.equal(sha(evidenceBytes), row.evidence_sha256, `evidence hash: ${row.case_id}`);
    assert.equal(evidence.status, "ok"); assert.equal(evidence.wire_model, report.config.model);
    assert.equal(evidence.physical_dispatches, 1); assert.equal(evidence.denied_physical_attempts, 0);
    assert.equal(evidence.physical_attempts.length, 1); assert.ok(["completed", "closed"].includes(evidence.physical_attempts[0].status));
    assert.equal(evidence.provider_terminal_status, "completed"); assert.deepEqual(evidence.tools, []);
    const rescored = H.scoreMove(c, H.DREAM_MODE, evidence.final_response, evidence, replay);
    assert.deepEqual(rescored, row.score, `re-score: ${row.case_id}`);
  }
  assert.deepEqual([...seen].sort(), ["p01_a", "p05_b", "p06_b", "p07_b", "p08_b"]);
  process.stdout.write(JSON.stringify({ report: reportDirectory, verified: seen.size, strict_correct: report.dream.summary.correct }) + "\n");
}

main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
