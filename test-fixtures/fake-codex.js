#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
let prompt = "";
process.stdin.on("data", chunk => { prompt += chunk; });
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    const schema = process.argv[process.argv.indexOf("--output-schema") + 1];
    process.stdout.write(JSON.stringify(schema.includes("reflection-proposal") ? {
      schema_version: "reflection-proposal-v1",
      actions: [{ action: "mark_duplicate", canonical_id: "a_reflect_one", duplicate_id: "a_reflect_two", reason: "same proposition; fixture source" }]
    } : prompt.includes("pizza") ? {
      claims: [
        { polarity: "positive", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99 },
        { polarity: "negative", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99 }
      ]
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
