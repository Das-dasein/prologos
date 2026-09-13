"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { MAX_RECORD_BYTES, assessRecord, fetchRecord, includedInSemverRange, newestRevision, parseRecord, prepareBundle, prologAtom, readResponseBytes, storeRawReceipts, timestampKey, toWorldItem } = require("./osv-advisory");

function raw({ id = "GHSA-test-0000-0000", modified = "2026-09-10T00:00:00Z", withdrawn, aliases = [], introduced = "0", fixed = "2.0.0", rangeType = "SEMVER" } = {}) {
  return Buffer.from(JSON.stringify({
    schema_version: "1.7.3", id, modified, ...(withdrawn ? { withdrawn } : {}), aliases,
    affected: [{ package: { ecosystem: "npm", name: "example" }, ranges: [{ type: rangeType, events: [{ introduced }, { fixed }] }] }],
  }));
}

test("OSV parser binds entry identity, revision time and exact receipt", () => {
  const record = parseRecord(raw());
  assert.equal(record.id, "GHSA-test-0000-0000");
  assert.equal(record.modified, "2026-09-10T00:00:00Z");
  assert.match(record.receipt_sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => parseRecord("{}"), /OSV id/);
  assert.throws(() => parseRecord(raw({ modified: "yesterday" })), /RFC3339/);
});

test("bounded SEMVER evaluation follows introduced-inclusive and fixed-exclusive boundaries", () => {
  const range = { type: "SEMVER", events: [{ introduced: "1.0.0" }, { fixed: "2.0.0" }, { introduced: "3.0.0" }, { fixed: "3.2.5" }] };
  assert.equal(includedInSemverRange("1.0.0", range), true);
  assert.equal(includedInSemverRange("1.9.9", range), true);
  assert.equal(includedInSemverRange("2.0.0", range), false);
  assert.equal(includedInSemverRange("3.2.4", range), true);
  assert.equal(includedInSemverRange("3.2.5", range), false);
  const limitedAndReopened = { type: "SEMVER", events: [{ introduced: "1.0.0" }, { limit: "2.0.0" }, { introduced: "3.0.0" }, { fixed: "4.0.0" }] };
  assert.equal(includedInSemverRange("2.5.0", limitedAndReopened), false);
  assert.equal(includedInSemverRange("3.5.0", limitedAndReopened), true);
  assert.throws(() => includedInSemverRange("1.5.0", { type: "SEMVER", events: [{ introduced: "2.0.0" }, { fixed: "1.0.0" }] }), /must be ordered/);
});

test("assessment distinguishes positive, negative, absent, unsupported and withdrawn records", () => {
  const target = { ecosystem: "npm", name: "example", version: "1.5.0" };
  assert.equal(assessRecord(parseRecord(raw()), target).status, "record_claims_affected");
  assert.equal(assessRecord(parseRecord(raw()), { ...target, version: "2.0.0" }).status, "record_does_not_claim_affected");
  assert.equal(assessRecord(parseRecord(raw({ rangeType: "ECOSYSTEM" })), target).status, "unsupported");
  const otherPackage = parseRecord(Buffer.from(JSON.stringify({ schema_version: "1.7.3", id: "GHSA-other-package", modified: "2026-09-10T00:00:00Z", affected: [{ package: { ecosystem: "npm", name: "other" }, versions: ["1.5.0"] }] })));
  assert.equal(assessRecord(otherPackage, target).status, "no_assessment");
  assert.equal(toWorldItem(prepareBundle([otherPackage.raw], target)[0]), null);
  const noVersionEvidence = parseRecord(Buffer.from(JSON.stringify({ schema_version: "1.7.3", id: "GHSA-no-version-evidence", modified: "2026-09-10T00:00:00Z", affected: [{ package: { ecosystem: "npm", name: "example" } }] })));
  assert.equal(assessRecord(noVersionEvidence, target).status, "no_assessment");
  const withdrawn = parseRecord(raw({ withdrawn: "2026-09-11T00:00:00Z" }));
  assert.equal(assessRecord(withdrawn, target).status, "withdrawn");
  assert.equal(toWorldItem(prepareBundle([withdrawn.raw], target)[0]), null);
});

test("aliases unify vulnerability identity without unifying source lineage", () => {
  const target = { ecosystem: "npm", name: "example", version: "1.5.0" };
  const bundle = prepareBundle([
    raw({ id: "GHSA-aaaa-bbbb-cccc", aliases: ["CVE-2026-1000", "GHSA-dddd-eeee-ffff"], fixed: "2.0.0" }),
    raw({ id: "GHSA-dddd-eeee-ffff", aliases: ["CVE-2026-1000", "GHSA-aaaa-bbbb-cccc"], fixed: "1.5.0" }),
  ], target);
  assert.equal(new Set(bundle.map(value => value.vulnerability_id)).size, 1);
  assert.equal(new Set(bundle.map(value => value.source_group_attestation.lineage_id)).size, 2);
  assert.deepEqual(bundle.map(value => value.assessment.status), ["record_claims_affected", "record_does_not_claim_affected"]);
});

test("a real-shaped alias disagreement reaches WorldAgent as a direct conflict", async t => {
  const target = { ecosystem: "npm", name: "example", version: "1.5.0" };
  const bundle = prepareBundle([
    raw({ id: "GHSA-aaaa-bbbb-cccc", aliases: ["GHSA-dddd-eeee-ffff"], fixed: "2.0.0" }),
    raw({ id: "GHSA-dddd-eeee-ffff", aliases: ["GHSA-aaaa-bbbb-cccc"], fixed: "1.5.0" }),
  ], target);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-conflict-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const agent = new WorldAgent(directory, { agent_id: "osv-conflict", ideas: { version: "osv-pilot-v1", predicates: [{ name: "record_claims_affected", arity: 3 }] }, startTime: 0 });
  for (const descriptor of bundle) {
    const source = agent.observe(descriptor.id, { sourceGroup: descriptor.source_group, sourceGroupAttestation: descriptor.source_group_attestation });
    const proposal = agent.propose(source, [toWorldItem(descriptor)]);
    await agent.admit(proposal, { admit: true, by: "osv_test_adapter", reason: "deterministic OSV fixture assessment" });
  }
  const query = `record_claims_affected(${prologAtom(bundle[0].vulnerability_id)},${prologAtom("npm:example")},${prologAtom("1.5.0")})`;
  await agent.startGoal({ id: "assessment", text: "Report the current advisory assessment.", query, action: "report_current_assessment" });
  const decision = await agent.step();
  assert.equal(decision.kind, "pause");
  assert.equal(decision.reason, "goal_conflicted");
});

test("newest revision is selected only among records with the same OSV id", () => {
  const old = parseRecord(raw({ modified: "2026-09-09T00:00:00Z" }));
  const current = parseRecord(raw({ modified: "2026-09-10T00:00:00Z" }));
  assert.equal(newestRevision([current, old]).modified, current.modified);
  assert.throws(() => newestRevision([old, parseRecord(raw({ id: "GHSA-other-0000-0000" }))]), /one entry id/);
  const exactSecond = parseRecord(raw({ modified: "2026-09-10T00:00:00Z" }));
  const fractional = parseRecord(raw({ modified: "2026-09-10T00:00:00.100000000Z" }));
  assert.equal(newestRevision([fractional, exactSecond]).modified, fractional.modified);
  assert.ok(timestampKey(fractional.modified) > timestampKey(exactSecond.modified));
});

test("raw receipts and network response identity are bounded", async t => {
  const bytes = raw(), directory = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-receipts-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const files = storeRawReceipts([bytes], directory);
  assert.equal(fs.existsSync(files[0]), true);
  const fetched = await fetchRecord("GHSA-test-0000-0000", { fetchImpl: async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes }) });
  assert.deepEqual(fetched, bytes);
  await assert.rejects(() => fetchRecord("GHSA-wrong-0000-0000", { fetchImpl: async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes }) }), /does not match/);

  let cancelled = false, reads = 0;
  const oversized = {
    headers: { get: () => null },
    body: { getReader: () => ({
      read: async () => (++reads <= 5 ? { done: false, value: Buffer.alloc(1024 * 1024) } : { done: true }),
      cancel: async () => { cancelled = true; },
    }) },
  };
  await assert.rejects(() => readResponseBytes(oversized), /exceeds size limit/);
  assert.equal(cancelled, true);
  assert.equal(reads, (MAX_RECORD_BYTES / (1024 * 1024)) + 1);
});
