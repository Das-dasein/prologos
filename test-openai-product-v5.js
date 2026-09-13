"use strict";

const assert = require("node:assert/strict");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const calls = [];
const candidate = validTo => ({
  schema_version: "memory-extraction-v5",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  policy_identity: ACTIVE_GROUNDING_POLICY.identity,
  decision: "write",
  clarification: null,
  assertions: [{
    polarity: "positive",
    relation: "knows_technology",
    arguments: ["user", "python"],
    valid_from: null,
    valid_to: validTo,
    confidence: 0.99,
    evidence_span: "Я знаю Python",
  }],
  ontology_candidates: [],
});

class FakeOpenAI {
  constructor() {
    return {
      chat: {
        completions: {
          parse: async request => {
            calls.push(request);
            return {
              model: request.model,
              choices: [{ message: { parsed: candidate(null) } }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            };
          },
        },
      },
    };
  }
}

const openaiModule = require.resolve("openai");
const providerModule = require.resolve("./providers/openai-api");
const originalOpenAI = require.cache[openaiModule];
require.cache[openaiModule] = { id: openaiModule, filename: openaiModule, loaded: true, exports: FakeOpenAI };
delete require.cache[providerModule];

(async () => {
  try {
    const provider = require("./providers/openai-api");
    const extracted = await provider.extractMemory("Я знаю Python");
    assert.equal(extracted.schema_version, "memory-extraction-v5");
    assert.deepEqual(extracted.policy_identity, ACTIVE_GROUNDING_POLICY.identity);
    assert.equal(calls[0].response_format.json_schema.name, "memory_extraction_v5");
    assert.match(calls[0].messages[0].content, new RegExp(ACTIVE_GROUNDING_POLICY.identity.sha256));

    const repaired = await provider.repairMemory("Я знаю Python", candidate(20260101), [{ code: "invalid_interval", path: "$.assertions[0]" }]);
    assert.equal(repaired.schema_version, "memory-extraction-v5");
    assert.equal(calls[1].response_format.json_schema.name, "memory_extraction_repair_v5");
    assert.match(calls[1].messages[0].content, /repairing one rejected extraction candidate/);
  } finally {
    delete require.cache[providerModule];
    if (originalOpenAI) require.cache[openaiModule] = originalOpenAI;
    else delete require.cache[openaiModule];
  }
  console.log("openai product provider ok: extraction and repair are policy-bound v5 calls");
})().catch(error => { console.error(error); process.exitCode = 1; });
