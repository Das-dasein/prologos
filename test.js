const { execFileSync } = require("node:child_process");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { MemoryStore, validateProposal } = require("./memory-store");
const { run: runCdrGold, fixedQuery } = require("./cdr-eval-harness");
const codexProvider = require("./providers/codex");

const output = execFileSync(process.execPath, ["cli.js", "demo.pl"], {
  encoding: "utf8",
});
assert.match(output, /Type = direct/);
assert.match(output, /Id1 = a1/);
assert.match(output, /Id2 = a2/);
assert.match(output, /Type = functional/);
assert.match(output, /Id1 = a3/);
assert.match(output, /Id2 = a4/);
console.log("ok");

assert.throws(() => validateProposal({
  polarity: "positive", relation: "consult", arguments: ["evil"],
  valid_from: null, valid_to: null, confidence: 1,
}), /not allowed/);

(async () => {
  const testRoot = path.join(process.cwd(), "test-tmp");
  fs.mkdirSync(testRoot, { recursive: true });

  const goldRun = await runCdrGold();
  assert.equal(goldRun.status, "ok");
  assert.equal(goldRun.case_count, 12);
  assert.equal(goldRun.cases.filter(item => item.status === "ok").length, 12);
  assert.match(goldRun.trusted_memory_sha256, /^[a-f0-9]{64}$/);
  const pinnedSourceRun = await runCdrGold({ sourceCommit: "a".repeat(40) });
  assert.equal(pinnedSourceRun.source_commit, "a".repeat(40));

  const badConfig = {
    ...JSON.parse(fs.readFileSync(".cdr/results/prolog-memory-eval-v0/eval-config-v1.json", "utf8")),
    trusted_memory_sha256: "0".repeat(64),
  };
  const badConfigFile = path.join(testRoot, "cdr-gold-bad-config.json");
  fs.writeFileSync(badConfigFile, JSON.stringify(badConfig), "utf8");
  await assert.rejects(
    runCdrGold({ config: badConfigFile }),
    error => error.code === "INPUT_SHA256",
  );
  assert.throws(
    () => fixedQuery({ case_id: "stable-01", oracle: { query: "true." } }),
    error => error.code === "QUERY_REGISTRY",
  );
  console.log("cdr gold harness ok");

  const dir = fs.mkdtempSync(path.join(testRoot, "prolog-memory-"));
  const store = new MemoryStore(path.join(dir, "memory.pl"));
  const base = { polarity: "positive", relation: "lives_in", arguments: ["user", "moscow"], valid_from: 20250101, valid_to: null, confidence: 0.9 };
  await store.add([base], "m1");
  const result = await store.add([{ ...base, arguments: ["user", "berlin"] }], "m2");
  assert.equal(result.conflicts.length, 1);
  assert.match(store.read(), /lives_in\(user,berlin\)/);
  console.log("memory-store ok");

  const oldBinary = process.env.CODEX_BIN;
  process.env.CODEX_BIN = path.join(process.cwd(), "test-fixtures", "fake-codex.js");
  const claims = await codexProvider.extractClaims("Я знаю Python");
  assert.equal(claims[0].relation, "knows_technology");
  assert.deepEqual(claims[0].arguments, ["user", "python"]);
  const reply = await codexProvider.respond("Что я знаю?", "knows_technology(user,python).", []);
  assert.match(reply, /Mock response/);
  if (oldBinary === undefined) delete process.env.CODEX_BIN;
  else process.env.CODEX_BIN = oldBinary;
  console.log("codex-provider ok");
})().catch(error => { console.error(error); process.exitCode = 1; });
