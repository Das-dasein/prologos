"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { fetchBundle, normalizeDoi, parseRecord, prepareBundle, readResponseBytes, sha256, storeRawReceipts } = require("./datacite-lineage");

function raw(doi, parent = null, relationType = "IsNewVersionOf") {
  return Buffer.from(JSON.stringify({ data: { id: doi, type: "dois", attributes: { doi, titles: [{ title: `Title ${doi}` }], relatedIdentifiers: parent ? [{ relationType, relatedIdentifier: parent, relatedIdentifierType: "DOI" }] : [] } } }));
}

test("DataCite DOI normalization and singleton validation are strict", () => {
  assert.equal(normalizeDoi("https://doi.org/10.1234/ABC"), "10.1234/abc");
  assert.equal(parseRecord(raw("10.1234/A")).doi, "10.1234/a");
  assert.throws(() => parseRecord("{}"), /singleton/);
  assert.throws(() => parseRecord(Buffer.from(JSON.stringify({ data: { id: "10.1234/a", type: "dois", attributes: { doi: "10.1234/b" } } }))), /mismatch/);
});

test("bundle resolves an explicit version chain to one recorded root", () => {
  const records = [raw("10.1234/v3", "10.1234/v2"), raw("10.1234/v2", "10.1234/v1"), raw("10.1234/v1")];
  const prepared = prepareBundle(records);
  assert.equal(prepared.length, 3);
  assert.equal(new Set(prepared.map(value => value.source_group_attestation.lineage_id)).size, 1);
  assert.equal(prepared[0].source_group_attestation.lineage_id, "datacite:doi:10.1234/v1");
  assert.equal(prepared.find(value => value.doi === "10.1234/v3").source_group_attestation.external_receipt_sha256, sha256(records[0]));
});

test("unknown roots remain explicit while ambiguity and cycles fail closed", () => {
  assert.equal(prepareBundle([raw("10.1234/v2", "10.1234/v1")])[0].source_group_attestation.lineage_id, "datacite:doi:10.1234/v1");
  const ambiguous = Buffer.from(JSON.stringify({ data: { id: "10.1234/x", type: "dois", attributes: { doi: "10.1234/x", relatedIdentifiers: ["a", "b"].map(x => ({ relationType: "IsDerivedFrom", relatedIdentifier: `10.1234/${x}`, relatedIdentifierType: "DOI" })) } } }));
  assert.throws(() => prepareBundle([ambiguous]), /multiple direct ancestors/);
  assert.throws(() => prepareBundle([raw("10.1234/a", "10.1234/b"), raw("10.1234/b", "10.1234/a")]), /cycle/);
});

test("raw receipts are content-addressed and feed an end-to-end v3 decision", async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-datacite-")); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const records = [raw("10.1234/a"), raw("10.1234/b")];
  const prepared = prepareBundle(records);
  const files = storeRawReceipts(records, path.join(dir, "receipts"));
  assert.equal(files.every(file => fs.existsSync(file)), true);
  const ideas = { version: "datacite-test-v1", predicates: [{ name: "ready", arity: 1 }] };
  const agent = new WorldAgent(path.join(dir, "world"), { agent_id: "datacite", ideas, startTime: 0 });
  for (const item of prepared) {
    const source = agent.observe(item.title, { sourceGroup: item.source_group, sourceGroupAttestation: item.source_group_attestation });
    const proposal = agent.propose(source, [{ program: "ready(orion)." }]);
    await agent.admit(proposal, { admit: true, by: "test_operator", reason: "fixture claim" });
  }
  await agent.startGoal({ id: "g", text: "release", query: "ready(orion)", action: "release", actionPolicy: { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true } });
  assert.equal((await agent.step()).kind, "act");
});

test("network traversal is bounded and follows only explicit ancestor relations", async () => {
  const responses = new Map([["10.1234/v2", raw("10.1234/v2", "10.1234/v1")], ["10.1234/v1", raw("10.1234/v1")]]);
  const calls = [];
  const fetched = await fetchBundle("10.1234/v2", { fetchImpl: async url => {
    const doi = decodeURIComponent(url.split("/").at(-1)); calls.push(doi);
    return { ok: true, status: 200, arrayBuffer: async () => responses.get(doi) };
  }});
  assert.deepEqual(calls, ["10.1234/v2", "10.1234/v1"]);
  assert.equal(fetched.length, 2);
});

test("response bodies are capped before an oversized payload is retained", async () => {
  await assert.rejects(() => readResponseBytes({ headers: { get: () => String(2 * 1024 * 1024 + 1) } }), /size limit/);
  let cancelled = false;
  const chunks = [Buffer.alloc(1024 * 1024), Buffer.alloc(1024 * 1024), Buffer.from("x")];
  await assert.rejects(() => readResponseBytes({ body: { getReader: () => ({ read: async () => chunks.length ? { done: false, value: chunks.shift() } : { done: true }, cancel: async () => { cancelled = true; } }) } }), /size limit/);
  assert.equal(cancelled, true);
});
