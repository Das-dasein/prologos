const { execFileSync } = require("node:child_process");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { MemoryStore, validateProposal } = require("./memory-store");
const { run: runCdrGold, fixedQuery } = require("./cdr-eval-harness");
const { consult: consultProlog, query: queryProlog } = require("./prolog-engine");
const { reflect } = require("./memory-reflection");
const { validateReflectionProposal, applyApprovedReflection } = require("./reflection-socrates");
const { runReflection } = require("./reflection-agent");
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

  const boundaryClaims = [
    "assertion(a,lives_in(user,samara)). assertion_polarity(a,positive). assertion_modality(a,asserted). assertion_time(a,interval(20260101,inf)). assertion_source(a,source). assertion_confidence(a,1).",
    "assertion(b,lives_in(user,berlin)). assertion_polarity(b,positive). assertion_modality(b,asserted). assertion_time(b,interval(20260101,inf)). assertion_source(b,source). assertion_confidence(b,1).",
  ].join("\n");
  const coreOnly = await consultProlog(`${fs.readFileSync("memory.pl", "utf8")}\n${boundaryClaims}`);
  assert.deepEqual(await queryProlog(coreOnly, "conflict(functional, A, B, R)."), []);
  const coreWithDomain = await consultProlog(
    `${fs.readFileSync("memory.pl", "utf8")}\n${fs.readFileSync("domain-rules.pl", "utf8")}\n${boundaryClaims}`,
  );
  assert.match((await queryProlog(coreWithDomain, "conflict(functional, A, B, R)."))[0], /R = lives_in/);
  const conflictingKnowledge = await consultProlog(`${fs.readFileSync("memory.pl", "utf8")}\n${fs.readFileSync("domain-rules.pl", "utf8")}\n` + [
    "assertion(j1,knows_technology(user,java)). assertion_polarity(j1,positive). assertion_modality(j1,asserted). assertion_time(j1,unknown). assertion_source(j1,source). assertion_confidence(j1,1).",
    "assertion(j2,knows_technology(user,java)). assertion_polarity(j2,negative). assertion_modality(j2,asserted). assertion_time(j2,unknown). assertion_source(j2,source). assertion_confidence(j2,1).",
    "assertion(p1,knows_technology(user,python)). assertion_polarity(p1,positive). assertion_modality(p1,asserted). assertion_time(p1,unknown). assertion_source(p1,source). assertion_confidence(p1,1).",
  ].join("\n"));
  assert.deepEqual(await queryProlog(conflictingKnowledge, "knows_multiple_programming_languages(user)."), []);
  assert.deepEqual(await queryProlog(conflictingKnowledge, "allowed_status_transition(extracted, accepted)."), ["true"]);
  assert.deepEqual(await queryProlog(conflictingKnowledge, "allowed_status_transition(accepted, extracted)."), []);
  assert.deepEqual(await queryProlog(conflictingKnowledge, "valid_assertion_status(conflicted)."), ["true"]);
  console.log("core/domain boundary ok");

  const dir = fs.mkdtempSync(path.join(testRoot, "prolog-memory-"));
  const store = new MemoryStore(path.join(dir, "memory.pl"));
  const base = { polarity: "positive", relation: "lives_in", arguments: ["user", "moscow"], valid_from: 20250101, valid_to: null, confidence: 0.9 };
  await store.add([base], "m1");
  const result = await store.add([{ ...base, arguments: ["user", "berlin"] }], "m2");
  assert.equal(result.conflicts.length, 1);
  assert.match(store.read(), /lives_in\(user,berlin\)/);
  console.log("memory-store ok");

  const reflection = await reflect();
  assert(reflection.duplicates.some(answer => answer.includes("works_at(user,softlink)")));
  assert(reflection.unknown_time.length > 0);
  assert(reflection.identity_review.some(answer => answer.includes("artem") && answer.includes("user")));
  const reflectionInput = { schema_version: "reflection-proposal-v1", actions: [{
    action: "mark_duplicate", canonical_id: "c_1788462646473_9d6d0f", duplicate_id: "c_20260903_002", reason: "same proposition; later source",
  }] };
  const checkedReflection = validateReflectionProposal(reflectionInput, fs.readFileSync(process.env.MEMORY_FILE || "data/memory.pl", "utf8"), reflection);
  assert.equal(checkedReflection.actions.length, 1);
  const reflectionMemory = path.join(dir, "reflection-memory.pl");
  fs.writeFileSync(reflectionMemory, fs.readFileSync(process.env.MEMORY_FILE || "data/memory.pl", "utf8"), "utf8");
  assert.throws(() => applyApprovedReflection(reflectionInput, reflectionMemory, { report: reflection }), /explicit approval/);
  const applied = applyApprovedReflection(reflectionInput, reflectionMemory, { approved: true, report: reflection });
  assert.deepEqual(applied.applied, ["assertion_revision(c_1788462646473_9d6d0f, replaces, c_20260903_002)."]);
  assert.match(fs.readFileSync(reflectionMemory, "utf8"), /assertion_revision\(c_1788462646473_9d6d0f, replaces, c_20260903_002\)/);
  const reviewInput = { schema_version: "reflection-proposal-v1", actions: [{ action: "review", assertion_id: "c_20260903_003", reason: "time needs clarification" }] };
  const reviewed = applyApprovedReflection(reviewInput, reflectionMemory, { approved: true, report: reflection });
  assert.deepEqual(reviewed.applied, ["assertion_status_event(c_20260903_003, reviewed)."]);
  const agentReflection = await runReflection({ provider: { reflect: async () => reflectionInput }, report: reflection });
  assert.equal(agentReflection.status, "accepted");
  assert.deepEqual(agentReflection.writes, []);
  console.log("memory reflection ok");

  const oldBinary = process.env.CODEX_BIN;
  process.env.CODEX_BIN = path.join(process.cwd(), "test-fixtures", "fake-codex.js");
  const claims = await codexProvider.extractClaims("Я знаю Python");
  assert.equal(claims[0].relation, "knows_technology");
  assert.deepEqual(claims[0].arguments, ["user", "python"]);
  const reply = await codexProvider.respond("Что я знаю?", "knows_technology(user,python).", []);
  assert.match(reply, /Mock response/);
  const reflectionProposal = await codexProvider.reflect({ duplicates: ["A = a1, B = a2"] });
  assert.equal(reflectionProposal.schema_version, "reflection-proposal-v1");
  assert.equal(reflectionProposal.actions[0].action, "mark_duplicate");
  if (oldBinary === undefined) delete process.env.CODEX_BIN;
  else process.env.CODEX_BIN = oldBinary;
  console.log("codex-provider ok");
})().catch(error => { console.error(error); process.exitCode = 1; });
