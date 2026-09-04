#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
let prompt = "";
process.stdin.on("data", chunk => { prompt += chunk; });
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    const schema = process.argv[process.argv.indexOf("--output-schema") + 1];
    const extractionSchema = schema.includes("reflection-proposal") ? null : JSON.parse(fs.readFileSync(schema, "utf8"));
    const identity = extractionSchema && Object.fromEntries(
      Object.entries(extractionSchema.properties.registry_identity.properties)
        .map(([key, value]) => [key, value.const]),
    );
    process.stdout.write(JSON.stringify(schema.includes("reflection-proposal") ? {
      schema_version: "reflection-proposal-v1",
      actions: [{ action: "mark_duplicate", canonical_id: "a_reflect_one", duplicate_id: "a_reflect_two", reason: "same proposition; fixture source" }]
    } : prompt.includes("pizza") ? {
      schema_version: "memory-extraction-v2",
      registry_identity: identity,
      assertions: [
        { polarity: "positive", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99 },
        { polarity: "negative", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99 }
      ],
      ontology_candidates: []
    } : {
      schema_version: "memory-extraction-v2",
      registry_identity: identity,
      assertions: [{
        polarity: "positive",
        relation: "knows_technology",
        arguments: ["user", "python"],
        valid_from: null,
        valid_to: null,
        confidence: 0.99
      }],
      ontology_candidates: []
    }));
  } else {
    process.stdout.write("Mock response grounded in Prolog memory.");
  }
});
