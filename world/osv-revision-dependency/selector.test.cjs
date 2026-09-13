"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseRecord } = require("../osv-advisory");
const { deriveTransition, npmPackages, probeVersions, selectCases } = require("./selector.cjs");

function record({ modified, fixed, introduced = "0", withdrawn } = {}) {
  return parseRecord(Buffer.from(JSON.stringify({
    schema_version: "1.7.3", id: "GHSA-selector-test", modified, ...(withdrawn ? { withdrawn } : {}),
    affected: [{ package: { ecosystem: "npm", name: "example" }, ranges: [{ type: "SEMVER", events: [{ introduced }, { fixed }] }] }],
  })));
}

test("selector derives the first exact boundary that changes classification", () => {
  const older = record({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" });
  const newer = record({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" });
  assert.deepEqual(npmPackages(older), ["example"]);
  assert.deepEqual(probeVersions([older, newer], "example"), ["1.0.0", "2.0.0", "2.0.1", "3.0.0", "3.0.1"]);
  const transition = deriveTransition(older, newer);
  assert.equal(transition.kind, "classification_flip");
  assert.deepEqual(transition.target, { ecosystem: "npm", name: "example", version: "2.0.0" });
  assert.equal(transition.before.status, "record_does_not_claim_affected");
  assert.equal(transition.after.status, "record_claims_affected");
});

test("withdrawal is selected only from an earlier determinate assessment", () => {
  const older = record({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" });
  const newer = record({ modified: "2026-01-02T00:00:00Z", fixed: "2.0.0", withdrawn: "2026-01-02T00:00:00Z" });
  const transition = deriveTransition(older, newer);
  assert.equal(transition.kind, "withdrawal");
  assert.equal(transition.before.status, "record_claims_affected");
  assert.equal(transition.after.status, "withdrawn");
});

test("metadata-only revisions do not create an eligible transition", () => {
  const older = record({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" });
  const newer = record({ modified: "2026-01-02T00:00:00Z", fixed: "2.0.0" });
  assert.equal(deriveTransition(older, newer), null);
});

test("repository selector freezes adjacent blobs at one full commit", t => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-selector-repo-"));
  const receipts = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-selector-receipts-"));
  t.after(() => { fs.rmSync(repository, { recursive: true, force: true }); fs.rmSync(receipts, { recursive: true, force: true }); });
  const run = args => childProcess.execFileSync("git", ["-C", repository, ...args], { encoding: "utf8" }).trim();
  childProcess.execFileSync("git", ["init", "-q", repository]);
  run(["config", "user.name", "Selector Test"]); run(["config", "user.email", "selector@example.invalid"]);
  const advisory = path.join(repository, "advisories/github-reviewed/2026/01/GHSA-selector-test/GHSA-selector-test.json");
  fs.mkdirSync(path.dirname(advisory), { recursive: true });
  fs.writeFileSync(advisory, record({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" }).raw);
  run(["add", "."]); run(["commit", "-q", "-m", "old revision"]);
  fs.writeFileSync(advisory, record({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" }).raw);
  run(["add", "."]); run(["commit", "-q", "-m", "new revision"]);
  const commit = run(["rev-parse", "HEAD"]);
  const fixture = selectCases({ repository, commit, count: 1, receiptDirectory: receipts });
  assert.equal(fixture.repository_commit, commit);
  assert.equal(fixture.cases.length, 1);
  assert.equal(fixture.cases[0].transition.kind, "classification_flip");
  assert.equal(fs.readdirSync(receipts).length, 2);
});
