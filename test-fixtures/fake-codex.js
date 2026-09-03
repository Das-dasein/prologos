#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
process.stdin.on("data", () => {});
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    const schema = process.argv[process.argv.indexOf("--output-schema") + 1];
    process.stdout.write(JSON.stringify(schema.includes("reflection-proposal") ? {
      schema_version: "reflection-proposal-v1",
      actions: [{ action: "mark_duplicate", canonical_id: "c_1788462646473_9d6d0f", duplicate_id: "c_20260903_002", reason: "same proposition; later source" }]
    } : schema.includes("semantic-dialogue") ? {
      schema_version: "semantic-dialogue-v1",
      registry: { version: "semantic-predicate-registry-v1", declarations: [{ name: "likes", arity: 2, argument_types: ["person", "thing"] }] },
      entities: [{ id: "person_1", type: "person" }, { id: "thing_1", type: "thing" }],
      assertions: [{ id: "a_1", predicate: "likes", arguments: ["person_1", "thing_1"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source: { kind: "dialogue", turn: "t1", span: "I like it." } }]
    } : {
      claims: [{
        polarity: "positive",
        relation: "knows_technology",
        arguments: ["user", "python"],
        valid_from: null,
        valid_to: null,
        confidence: 0.99
      }]
    }));
  } else {
    process.stdout.write("Mock response grounded in Prolog memory.");
  }
});
