const readline = require("node:readline/promises");
const { MemoryStore } = require("./memory-store");
const { createProvider } = require("./providers");

const memory = new MemoryStore(process.env.MEMORY_FILE || "data/memory.pl");
const provider = createProvider();

async function turn(text) {
  const messageId = `m_${Date.now()}`;
  const proposals = await provider.extractClaims(text);
  const stored = await memory.add(proposals, messageId);
  const context = memory.read().slice(-12000);
  return { reply: await provider.respond(text, context, stored.conflicts), ...stored };
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Prolog memory chat (${provider.name}). Commands: /memory, /exit`);
  while (true) {
    const text = (await rl.question("you> ")).trim();
    if (!text) continue;
    if (text === "/exit") break;
    if (text === "/memory") { console.log(memory.read()); continue; }
    try {
      const result = await turn(text);
      console.log(`ai> ${result.reply}`);
      if (process.env.DEBUG_MEMORY === "1") {
        result.facts.forEach(f => console.log(`  + ${f.text}`));
        result.conflicts.forEach(c => console.log(`  ! ${c}`));
      }
    } catch (error) {
      console.error(`error> ${error.message}`);
    }
  }
  rl.close();
}

if (require.main === module) main();
module.exports = { turn };
