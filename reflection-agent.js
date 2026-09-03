"use strict";

const { createProvider } = require("./providers");
const { reflect: collectReflection } = require("./memory-reflection");
const { validateReflectionProposal } = require("./reflection-socrates");

async function runReflection({ provider = createProvider(), memoryFile, report } = {}) {
  const diagnostics = report || await collectReflection(memoryFile);
  const proposal = await provider.reflect(diagnostics);
  try {
    const checked = validateReflectionProposal(proposal, require("node:fs").readFileSync(memoryFile || process.env.MEMORY_FILE || "data/memory.pl", "utf8"), diagnostics);
    return { status: "accepted", diagnostics, proposal: checked, writes: [] };
  } catch (error) {
    return { status: "rejected", diagnostics, proposal, error: { code: "SOCRATES_REJECTED", message: error.message }, writes: [] };
  }
}

if (require.main === module) runReflection().then(result => {
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error(String(error));
  process.exitCode = 1;
});

module.exports = { runReflection };
