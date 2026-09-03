#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
process.stdin.on("data", () => {});
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    const schema = process.argv[process.argv.indexOf("--output-schema") + 1];
    process.stdout.write(JSON.stringify(schema.includes("reflection-proposal") ? {
      schema_version: "reflection-proposal-v1",
      actions: [{ action: "mark_duplicate", canonical_id: "a2", duplicate_id: "a1", reason: "same proposition; a2 is the later assertion" }]
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
