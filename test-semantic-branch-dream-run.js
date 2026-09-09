"use strict";
const assert = require("node:assert/strict");
const { formalPrompt, hypothesisPrompt } = require("./semantic-branch-dream-run");
const item = { world: [{ id: "s1", text: "Ada paints." }], question: "Is Ada ready?" };
const baseline = { program: "axiom(s1, paints(ada)).", query: "ready(ada)" };
assert.match(formalPrompt(item), /s1: Ada paints\./); assert.match(formalPrompt(item), /Question:/);
assert.match(hypothesisPrompt(item, baseline), /Do not repair it/); assert.match(hypothesisPrompt(item, baseline), /axiom\(s1/);
console.log("semantic-branch-dream-run ok: frozen baseline and bounded-hypothesis prompts are separated");
