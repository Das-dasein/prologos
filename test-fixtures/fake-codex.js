#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
process.stdin.on("data", () => {});
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    process.stdout.write(JSON.stringify({
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

