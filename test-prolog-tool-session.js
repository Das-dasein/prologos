"use strict";
const assert = require("node:assert/strict");
const { createPrologToolSession } = require("./prolog-tool-session");
(async () => {
  const session = createPrologToolSession({ caseId: "tool-session-test", sourceSentences: { s1: "Selah has wings.", s2: "Selah has a serpent body.", s3: "If Selah has wings and a serpent body, then she can rule the ocean.", s4: "If Selah has teeth, then she is formidable." }, expectedGoal: { predicate: "rules_the_ocean", subject: "selah" }, targetRuleSourceId: "s3" });
  await session.execute("add_fact", { label: "s1", source_id: "s1", fact: { predicate: "has_wings", subject: "selah" } });
  await session.execute("add_fact", { label: "s2", source_id: "s2", fact: { predicate: "has_serpent_body", subject: "selah" } });
  await session.execute("add_rule", { label: "s3", source_id: "s3", premises: [{ predicate: "has_wings", subject: "selah" }, { predicate: "has_serpent_body", subject: "selah" }], conclusion: { predicate: "rules_the_ocean", subject: "selah" } });
  const proof = await session.execute("prove", { goal: { predicate: "rules_the_ocean", subject: "selah" } });
  assert.equal(proof.execution_outcome, "succeeded"); assert.match(proof.transcript, /proof_tree\(rules_the_ocean\(selah\)/); assert.match(proof.program, /axiom\(s3, rule/); assert.deepEqual(proof.proof_source_ids, ["s1", "s2", "s3"]); assert.deepEqual(proof.unused_source_ids, []);
  await assert.rejects(session.execute("add_fact", { label: "s1", source_id: "s1", fact: { predicate: "x", subject: "selah" } }), /fresh/);
  await assert.rejects(session.execute("add_fact", { label: "s4", source_id: "s4", fact: { predicate: "has_teeth", subject: "selah" } }), /conditional/);
  await assert.rejects(session.execute("add_rule", { label: "r4", source_id: "s3", premises: [{ predicate: "has_wings", subject: "selah" }], conclusion: { predicate: "can_rule_ocean", subject: "selah" } }), /conclusion must be rules_the_ocean/);
  console.log("prolog-tool-session ok: model-selected terms compile to an actual audited Prolog proof");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
