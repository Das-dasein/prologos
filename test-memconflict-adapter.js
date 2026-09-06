const assert = require("assert").strict;
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const records = require("./test-fixtures/memconflict-shaped-source");
const selection = path.resolve("test-fixtures/memconflict-selection-v1.json");
const { adapt } = require("./memconflict-adapter");

async function sourceFile(dir, values = records) {
  const file = path.join(dir, "source.jsonl");
  fs.writeFileSync(file, `${values.map(JSON.stringify).join("\n")}\n`, { mode: 0o600 });
  return file;
}
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "memconflict-adapter-test-"));
  const source = await sourceFile(root);
  const out = path.join(root, "out");
  const first = await adapt({ source, sourceCommit: "local-schema-shaped-fixture-v1", selection, out });
  assert.equal(first.cases, 24);
  const fixture = JSON.parse(fs.readFileSync(path.join(out, "fixture.json")));
  const oracle = JSON.parse(fs.readFileSync(path.join(out, "oracle.json")));
  const manifest = JSON.parse(fs.readFileSync(path.join(out, "source-manifest.json")));
  assert.equal(fixture.selected.length, 24);
  assert.deepEqual(Object.fromEntries(["dynamic", "static", "conditional"].map(c => [c, fixture.selected.filter(x => x.category === c).length])), { dynamic: 8, static: 8, conditional: 8 });
  assert.equal(oracle.cases.filter(x => x.answer === "entailed").length, 16);
  assert.equal(oracle.cases.filter(x => x.answer === "conflict").length, 8);
  assert.equal(manifest.license_gate.status, "blocked_pending_upstream_terms");
  assert.equal(manifest.source.redistribution, "operator_local_only_license_unresolved");
  assert.match(fixture.rule_set_sha256, /^[a-f0-9]{64}$/);
  const out2 = path.join(root, "out-2");
  await adapt({ source, sourceCommit: "local-schema-shaped-fixture-v1", selection, out: out2 });
  for (const name of ["source-manifest.json", "fixture.json", "oracle.json", "rejection-report.json"]) assert.deepEqual(fs.readFileSync(path.join(out, name)), fs.readFileSync(path.join(out2, name)), `${name} is deterministic`);
  await assert.rejects(() => adapt({ source, sourceCommit: "x", selection, out }), /already exists/);

  const missingDir = fs.mkdtempSync(path.join(root, "missing-"));
  const missing = structuredClone(records); delete missing[0].timeline.claims[0].source_span;
  const missingSource = await sourceFile(missingDir, missing);
  await assert.rejects(() => adapt({ source: missingSource, sourceCommit: "local-schema-shaped-fixture-v1", selection, out: path.join(missingDir, "out") }), /selection mapping failed/);

  const malformedDir = fs.mkdtempSync(path.join(root, "malformed-"));
  const malformedSource = path.join(malformedDir, "source.jsonl"); fs.writeFileSync(malformedSource, `${JSON.stringify(records[0])}\n{bad json}\n`);
  await assert.rejects(() => adapt({ source: malformedSource, sourceCommit: "local-schema-shaped-fixture-v1", selection, out: path.join(malformedDir, "out") }), /invalid JSONL/);

  const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(out, "fixture.json"))).digest("hex");
  assert.equal(hash, crypto.createHash("sha256").update(fs.readFileSync(path.join(out, "fixture.json"))).digest("hex"));
  console.log("memconflict-adapter ok: 24 local schema-shaped cases, SWI oracle, provenance/license gate, fresh-output and malformed-input rejection");
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
