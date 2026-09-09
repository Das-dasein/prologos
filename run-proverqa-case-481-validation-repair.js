"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");
const { repairPrompt } = require("./free-prolog-diagnostic-collector");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const previousFile = path.join(__dirname, ".cdr/waves/llm-metaprolog-chain-memory-v1/raw-terra-proverqa-hard-five-case-p0-p1-p2-domain-repair-r2-2026-09-07T14-04-32-904Z/p2/proverqa-hard-481.json");
const contextFile = path.join(__dirname, ".cdr/waves/llm-metaprolog-chain-memory-v1/raw-terra-proverqa-hard-five-case-p0-p1-p2-domain-repair-r2-2026-09-07T14-04-32-904Z/p0/proverqa-hard-481.json");
async function main() {
  const previous = JSON.parse(fs.readFileSync(previousFile, "utf8")).attempts[1].generated;
  const promptText = JSON.parse(fs.readFileSync(contextFile, "utf8")).prompt;
  const [, context, question] = promptText.match(/World:\n([\s\S]*)\n\nQuestion:\n([\s\S]*)$/) || [];
  if (!context || !question) throw Error("saved source prompt malformed");
  const item = { context, question };
  const replay = await runFreePrologDiagnostic({ caseId: "proverqa-hard-481-r3-quantifier-replay", program: previous.program, query: previous.query, source: "saved-r3-quantifier-replay", timeoutMs: 4000, maxOutputBytes: 262144 });
  const evidence = replay;
  const prompt = repairPrompt(item, previous, evidence, null, JSON.parse(fs.readFileSync(path.join(__dirname, ".cdr/waves/llm-metaprolog-chain-memory-v1/prompts/free-prolog-v11-labelled-explanations.json"), "utf8")));
  const generated = await createCodexFreePrologGenerator({ codexPath: "/Users/artem/.local/bin/codex", model: "gpt-5.6-terra" })({ prompt });
  const observation = await runFreePrologDiagnostic({ caseId: "proverqa-hard-481-validation-repair-r3", program: generated.program, query: generated.query, source: "validation-repair", timeoutMs: 4000, maxOutputBytes: 262144 });
  const root = path.join(__dirname, ".cdr/waves/llm-metaprolog-chain-memory-v1", `raw-proverqa-hard-481-validation-repair-r3-${new Date().toISOString().replace(/[:.]/g,"-")}`); fs.mkdirSync(root, { mode: 0o700 });
  fs.writeFileSync(path.join(root, "record.json"), JSON.stringify({ status: "observed-not-scored", previous_program_sha256: sha(previous.program), prompt_sha256: sha(prompt), prompt, previous, replay, generated, observation }, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ raw_root: root, outcome: observation.execution_outcome, transcript: observation.runtime.transcript.transcript }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
