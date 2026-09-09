"use strict";
const assert = require("node:assert/strict");
const { formalPrompt, prompt } = require("./semantic-branch-dream-v3-run");
const { candidateHash } = require("./semantic-branch-dream");
const item = { case_id: "v3-orxor-01", target_sentence_id: "s2", world: [{ id: "s1", text: "Arin studies physics." }, { id: "s2", text: "Arin either studies physics or studies music." }] };
const baseline = { program: "domain(person,[arin]).\naxiom(s1,studies_physics(arin)).\naxiom(s2,or(studies_physics(arin),studies_music(arin))).", query: "studies_music(arin)" };
assert.match(prompt(item, baseline), /exactly one, never both/); assert.match(prompt(item, baseline), new RegExp(candidateHash(baseline))); assert.match(prompt(item, baseline), /No aliases, type assumptions/);
assert.match(formalPrompt(item), /not mutually exclusive/);
console.log("semantic-branch-dream-v3-run ok: varied explicit controls stay out of the branch schema");
