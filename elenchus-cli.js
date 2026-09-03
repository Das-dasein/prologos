"use strict";

const fs = require("node:fs");
const { evaluateHypothesis } = require("./hypothesis-elenchus");

const args = process.argv.slice(2);
const valueAfter = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const hypothesisFile = valueAfter("--hypothesis");
const memoryPath = valueAfter("--memory") || process.env.MEMORY_FILE || "data/memory.pl";
if (!hypothesisFile) {
  console.error("usage: node elenchus-cli.js --hypothesis FILE [--memory FILE]");
  process.exitCode = 2;
} else {
  let hypothesis;
  try { hypothesis = JSON.parse(fs.readFileSync(hypothesisFile, "utf8")); }
  catch (error) { console.error(`cannot read hypothesis: ${error.message}`); process.exitCode = 2; }
  if (hypothesis) evaluateHypothesis(hypothesis, { memoryPath }).then(result => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.decision === "rejected" && result.error) process.exitCode = 1;
  }).catch(error => { console.error(String(error)); process.exitCode = 1; });
}
