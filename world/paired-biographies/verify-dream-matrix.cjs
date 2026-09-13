#!/usr/bin/env node
"use strict";

// Offline verification of the retained counterbalanced dream matrix.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const CurrentH = require("./harness.cjs");

const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const root = path.resolve(__dirname, "../..");
const directory = path.resolve(process.argv[2] || path.join(root, "reports/paired-biographies-v1/luna-dream-matrix-v1"));

async function main() {
  const report = JSON.parse(fs.readFileSync(path.join(directory, "report.json"), "utf8"));
  const sourceFor = file => { const source = report.sources.find(entry => entry.file === file); assert.ok(source, `retained source required: ${file}`); return source; };
  // The original matrix snapshot omitted cognitive-memory.js, which the
  // retained agent module imports. The scorer itself is in harness.cjs; verify
  // its current bytes and use that exact current scorer instead of pretending
  // an incomplete source tree can be required as a module.
  const H = CurrentH, M = require("./dream-matrix.cjs");
  for (const file of ["world/paired-biographies/harness.cjs", "world/paired-biographies/dream-matrix.cjs"]) {
    const source = sourceFor(file), current = fs.readFileSync(path.join(root, file));
    assert.equal(sha(current), source.sha256, `scorer source drift: ${file}`);
  }
  assert.equal(report.version, "paired-dream-matrix-v1"); assert.equal(report.status, "completed");
  assert.equal(report.protocol.repetitions, 2); assert.equal(report.config.model, "gpt-5.6-luna");
  for (const source of report.sources) {
    const retained = fs.readFileSync(path.join(directory, source.snapshot));
    assert.equal(sha(retained), source.sha256, `retained source: ${source.file}`);
  }
  const dataset = await CurrentH.loadDataset();
  assert.equal(report.dataset_sha256, dataset.dataset_sha256); assert.equal(report.schema_sha256, dataset.schema_sha256);
  const expected = M.cells(dataset.rows, report.protocol.repetitions), byId = new Map(dataset.rows.map(row => [row.case_id, row]));
  assert.deepEqual(report.cells.map(cell => ({ repetition: cell.repetition, case_id: cell.case_id, mode: cell.mode, order: cell.order })), expected);
  for (const cell of report.cells) {
    const c = byId.get(cell.case_id), replay = JSON.parse(fs.readFileSync(path.join(directory, cell.replay), "utf8"));
    assert.ok(c?.dream_eligibility.eligible); assert.equal(replay.strategy, cell.mode === H.DREAM_MODE ? "dream" : "missing");
    const evidenceBytes = fs.readFileSync(path.join(directory, cell.evidence)), evidence = JSON.parse(evidenceBytes);
    assert.equal(sha(evidenceBytes), cell.evidence_sha256, `evidence hash: r${cell.repetition}/${cell.case_id}/${cell.mode}`);
    assert.equal(evidence.status, "ok"); assert.equal(evidence.wire_model, report.config.model);
    assert.equal(evidence.physical_dispatches, 1); assert.equal(evidence.denied_physical_attempts, 0);
    assert.equal(evidence.physical_attempts.length, 1); assert.ok(["completed", "closed"].includes(evidence.physical_attempts[0].status));
    assert.equal(evidence.provider_terminal_status, "completed"); assert.deepEqual(evidence.tools, []);
    assert.deepEqual(H.scoreMove(c, cell.mode, evidence.final_response || "", evidence, replay), cell.score, `re-score: r${cell.repetition}/${cell.case_id}/${cell.mode}`);
  }
  assert.deepEqual(report.summary, M.summarize(report.cells));
  assert.deepEqual(report.summary, {
    checked_prolog: { attempted: 10, strict_correct: 5, decision_correct: 6, total: 10 },
    checked_prolog_dream: { attempted: 10, strict_correct: 6, decision_correct: 8, total: 10 }
  });
  process.stdout.write(JSON.stringify({ report: directory, verified_cells: report.cells.length, summary: report.summary }) + "\n");
}
main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
