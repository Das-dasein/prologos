"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { applyApprovedReflection } = require("./reflection-socrates");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  const proposalFile = argument("--proposal");
  const memoryFile = argument("--memory") || process.env.MEMORY_FILE || "data/memory.pl";
  if (!proposalFile) throw new Error("usage: npm run reflect:apply -- --proposal RESULT.json [--memory FILE] --approve");
  if (!process.argv.includes("--approve")) throw new Error("Socrates: explicit --approve is required");
  const result = JSON.parse(fs.readFileSync(path.resolve(proposalFile), "utf8"));
  if (result.status !== "accepted" || !result.proposal || !result.diagnostics) throw new Error("proposal result is not an accepted reflection report");
  const applied = applyApprovedReflection(result.proposal, memoryFile, { approved: true, report: result.diagnostics });
  console.log(JSON.stringify({ status: "applied", ...applied }, null, 2));
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(String(error)); process.exitCode = 1; }
}

module.exports = { main };
