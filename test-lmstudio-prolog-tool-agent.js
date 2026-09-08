"use strict";
const assert = require("node:assert/strict");
const { createLmStudioPrologToolAgent } = require("./lmstudio-prolog-tool-agent");
(async () => {
  let turn = 0;
  const replies = [
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "1", type: "function", function: { name: "add_fact", arguments: JSON.stringify({ label: "s1", source_id: "s1", fact: { predicate: "has_wings", subject: "selah" } }) } }, { id: "ignored", type: "function", function: { name: "prove", arguments: JSON.stringify({ goal: { predicate: "rules_the_ocean", subject: "selah" } }) } }] } }] },
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "2", type: "function", function: { name: "add_fact", arguments: JSON.stringify({ label: "s2", source_id: "s2", fact: { predicate: "has_serpent_body", subject: "selah" } }) } }] } }] },
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "3", type: "function", function: { name: "add_rule", arguments: JSON.stringify({ label: "s3", source_id: "s3", premises: [{ predicate: "has_wings", subject: "selah" }, { predicate: "has_serpent_body", subject: "selah" }], conclusion: { predicate: "rules_the_ocean", subject: "selah" } }) } }] } }] },
    { choices: [{ message: { role: "assistant", tool_calls: [{ id: "4", type: "function", function: { name: "prove", arguments: JSON.stringify({ goal: { predicate: "rules_the_ocean", subject: "selah" } }) } }] } }] },
    { choices: [{ message: { role: "assistant", content: "proved" } }] }
  ];
  const agent = createLmStudioPrologToolAgent({ model: "local-test", fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify(replies[turn++]) }) });
  const result = await agent({ caseId: "tool-agent", prompt: "Use the tools.", sourceSentences: { s1: "Selah has wings.", s2: "Selah has a serpent body.", s3: "If Selah has wings and a serpent body, then she can rule the ocean." }, expectedGoal: { predicate: "rules_the_ocean", subject: "selah" }, targetRuleSourceId: "s3" });
  assert.equal(result.final, "proved"); assert.equal(result.calls.length, 4); assert.match(result.program, /axiom\(s3, rule/); assert.equal(result.transport.responses[0].request.tool_choice, "required");
  console.log("lmstudio-prolog-tool-agent ok: enforced tool loop preserves model calls and real Prolog proof");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
