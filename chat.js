const readline = require("node:readline/promises");
const { MemoryStore } = require("./memory-store");
const { createProvider } = require("./providers");
const { admitExtraction, processExtractionTurn } = require("./extraction-admission");

const memory = new MemoryStore(process.env.MEMORY_FILE || "data/memory.pl");
const provider = createProvider();

async function turn(text, options = {}) {
  const activeMemory = options.memory || memory;
  const activeProvider = options.provider || provider;
  const messageId = `m_${Date.now()}`;
  const stored = await processExtractionTurn({
    text,
    messageId,
    provider: activeProvider,
    memory: activeMemory,
    repairEnabled: options.repairEnabled ?? process.env.MEMORY_REPAIR === "1",
    auditFile: options.auditFile === undefined ? process.env.MEMORY_ADMISSION_AUDIT_FILE || "data/extraction-admission.jsonl" : options.auditFile,
  });
  const context = activeMemory.read().slice(-12000);
  return { reply: stored.clarification_question || await activeProvider.respond(text, context, stored.conflicts), ...stored };
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let pendingCandidate = null;
  const auditFile = process.env.MEMORY_ADMISSION_AUDIT_FILE || "data/extraction-admission.jsonl";
  console.log(`Prolog memory chat (${provider.name}). Commands: /memory, /candidate, /admit, /exit`);
  while (true) {
    const text = (await rl.question("you> ")).trim();
    if (!text) continue;
    if (text === "/exit") break;
    if (text === "/memory") { console.log(memory.read()); continue; }
    if (text === "/candidate") {
      console.log(pendingCandidate ? JSON.stringify(pendingCandidate, null, 2) : "admission> no pending candidate");
      continue;
    }
    if (text === "/admit") {
      if (!pendingCandidate) { console.log("admission> no pending candidate"); continue; }
      try {
        const admitted = await admitExtraction({ receipt: pendingCandidate, approved: true, memory, auditFile });
        console.log(`admission> admitted ${admitted.facts.length} assertion(s); conflicts: ${admitted.conflicts.length}`);
        pendingCandidate = null;
      } catch (error) {
        console.error(`error> ${error.message}`);
      }
      continue;
    }
    try {
      const result = await turn(text);
      console.log(`ai> ${result.reply}`);
      pendingCandidate = ["primary_proposed_unadmitted", "repair_proposed_unadmitted"].includes(result.admission_status) ? result.admission_receipt : null;
      if (pendingCandidate) console.log(`admission> ${result.admission_status}; use /candidate to inspect it and /admit to approve it explicitly`);
      else console.log(`admission> extraction not admitted (${result.admission_status})`);
      if (process.env.DEBUG_MEMORY === "1") {
        result.facts.forEach(f => console.log(`  + ${f.text}`));
        result.conflicts.forEach(c => console.log(`  ! ${c}`));
        result.ontology_candidates.forEach(candidate => console.log(`  ? ontology candidate: ${JSON.stringify(candidate)}`));
        if (result.admission_receipt) console.log(`  ? admission receipt: ${JSON.stringify(result.admission_receipt)}`);
      }
    } catch (error) {
      console.error(`error> ${error.message}`);
    }
  }
  rl.close();
}

if (require.main === module) main();
module.exports = { turn };
