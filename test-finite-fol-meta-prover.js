"use strict";
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const swipl = process.env.SWIPL_BIN || "/opt/homebrew/bin/swipl";
if (!fs.existsSync(swipl)) {
  console.log("finite-fol-meta-prover skipped: SWI-Prolog unavailable");
} else {
  const result = childProcess.spawnSync(swipl, ["--quiet", "--nosignals", "-s", path.join(__dirname, "test-finite-fol-meta-prover.pl"), "-g", "run_tests", "-t", "halt"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  console.log("finite-fol-meta-prover ok: finite quantifiers, xor, explicit negation, conflict, and model budget");
}
