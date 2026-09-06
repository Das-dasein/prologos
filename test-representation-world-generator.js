"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  ANSWER_INSTRUCTION,
  DEFAULT_SEED,
  FORBIDDEN_PUBLIC_FIELDS,
  assemblePromptPair,
  generateFixture,
  runPrologOracle,
  sourceWorld,
  stable,
  validateCoverage,
  writeFixture,
} = require("./representation-world-generator");

async function main() {
  // Behavioural isolation: requiring and assembling a prompt pair must not
  // load the adapter, much less call an oracle.
  const adapter = require.resolve("./prolog-engine");
  delete require.cache[adapter];
  const world = sourceWorld({ seed: DEFAULT_SEED, depth: 3, topology: "join", expected: "entailed", replica: 1 });
  const pair = assemblePromptPair(world);
  assert.equal(require.cache[adapter], undefined, "prompt assembly must not load a Prolog adapter");

  // Static isolation: the provider-facing assembler has neither oracle nor
  // adapter references.  Its two products differ only in representation.
  const assemblerSource = assemblePromptPair.toString();
  assert.doesNotMatch(assemblerSource, /oracle|runPrologOracle|require\s*\(/i);
  assert.equal(pair.p0.replace(pair.p0.match(/Facts:\n[\s\S]*\nQuestion:/)[0].slice(0, -"Question:".length), "<REPRESENTATION>\n"), pair.p1.replace(pair.p1.match(/source\([\s\S]*\nQuestion:/)[0].slice(0, -"Question:".length), "<REPRESENTATION>\n"), "P0/P1 must have byte-identical non-representation text");
  assert.match(pair.p0, /Facts:/); assert.doesNotMatch(pair.p1, /Facts:/);
  assert.match(pair.p0, new RegExp(ANSWER_INSTRUCTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(pair.p1, new RegExp(ANSWER_INSTRUCTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const first = await generateFixture({ seed: DEFAULT_SEED });
  const second = await generateFixture({ seed: DEFAULT_SEED });
  assert.equal(stable(first), stable(second), "fixed seed fixture must be byte-for-byte reproducible");
  assert.equal(first.cases.length, 24);
  assert.doesNotThrow(() => validateCoverage(first.cases));

  const counts = new Map();
  for (const item of first.cases) {
    const key = `${item.stratum.depth}:${item.stratum.topology}:${item.oracle.label}:${item.stratum.replica}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    assert.deepEqual(await runPrologOracle(item.formal_world), item.oracle, `oracle agreement: ${item.case_id}`);

    const { p0, p1 } = item.prompts;
    const p0Normalized = p0.replace(item.renderings.p0, "<REPRESENTATION>");
    const p1Normalized = p1.replace(item.renderings.p1, "<REPRESENTATION>");
    assert.equal(p0Normalized, p1Normalized, `non-representation prompt bytes: ${item.case_id}`);
    assert.equal(p0Normalized, `You are given a finite rule world.\n<REPRESENTATION>\n${item.prompts.p0.match(/Question:[\s\S]*$/)[0]}`);
    for (const prompt of [p0, p1]) {
      for (const marker of FORBIDDEN_PUBLIC_FIELDS) assert.doesNotMatch(prompt, new RegExp(`\\b${marker}\\b`, "i"), `${item.case_id} leaked ${marker}`);
      assert.doesNotMatch(prompt, /runTrustedQuery|runPrologOracle|SWI-Prolog/i, `${item.case_id} leaked solver capability`);
    }

    if (item.stratum.topology === "join") {
      const join = item.formal_world.rules[0];
      assert.equal(join.body.length, 2, `${item.case_id} join must be conjunctive`);
      assert.equal(join.body[0].args[0], join.body[1].args[0], `${item.case_id} join variables must be shared`);
      assert.match(item.renderings.p0, / and /, `${item.case_id} natural rendering must preserve conjunction`);
    }
    if (item.oracle.label === "unknown") {
      assert.doesNotMatch(JSON.stringify(item.formal_world.facts), /not_|negative|false/i, `${item.case_id} unknown must not use a negative fact`);
      assert(!item.formal_world.facts.some(fact => fact.predicate === item.formal_world.query.predicate && fact.args[0] === item.formal_world.query.args[0]), `${item.case_id} unknown goal must not be an explicit fact`);
    }
  }
  assert.equal(counts.size, 24);
  assert([...counts.values()].every(count => count === 1));

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "representation-world-"));
  const output = path.join(root, "fixture.json");
  const written = writeFixture(output, first);
  assert.equal(fs.readFileSync(output, "utf8"), stable(first));
  assert.match(written.sha256, /^[a-f0-9]{64}$/);
  console.log("representation-world-generator ok: 24 deterministic P0/P1 pairs, isolated prompt assembly, and independently recomputed SWI oracle");
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
