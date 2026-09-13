"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { seed, GOAL } = require("./scenario");
const { WorldAgent } = require("./agent");
const { writeReport } = require("./report");
const { hash, check } = require("./checker");

async function demo(directory) {
  directory = path.resolve(directory);
  fs.mkdirSync(directory, { recursive: false });
  const episodes = [];
  for (const independent of [false, true]) {
    const label = independent ? "H2" : "H1";
    const agent = await seed(path.join(directory, label), { independent });
    const control = await seed(path.join(directory, `${label}-control`), { independent });
    const first = await agent.step({ strategy: "dream" });
    const controlDecision = await control.step({ strategy: "missing" });
    if (first.kind !== (independent ? "act" : "ask") || controlDecision.kind !== first.kind) throw new Error(`${label}: episode or control did not satisfy the protocol`);
    const initialReflection = agent.state().goal.reflection;
    if (initialReflection.snapshot.sha256 !== initialReflection.snapshot_after || initialReflection.cost.branches !== (independent ? 0 : 2)) throw new Error(`${label}: dream invariant failed`);
    const continuation = [];
    if (first.kind === "ask") {
      const restarted = new WorldAgent(agent.journal.directory);
      await restarted.answer("yes", { at: 101, evidenceText: "Резерв orion готов — это явный ответ участника синтетической сцены." });
      continuation.push({ event: "restart_and_answer", answer: "yes", decision: await restarted.step() });
    }
    const restarted = new WorldAgent(agent.journal.directory);
    restarted.outcome("success", "Симулятор сообщил: выпуск выполнен.", { at: 102 });
    const recalled = new WorldAgent(agent.journal.directory);
    const later = await check({ snapshot: recalled.snapshot(), query: GOAL.query });
    if (later.safe_status !== "entailed" || recalled.state().goal.status !== "completed") throw new Error(`${label}: recall or completion failed`);
    continuation.push({ event: "later_recall_after_outcome", result: later, episode_status: recalled.state().goal.status });
    episodes.push({ label, explanation: independent ? "Старое правило разрешает независимый подтверждённый путь. Состояние резерва не меняет решение о выпуске." : "Старое правило связывает выпуск с готовностью резерва. Уточнение меняет доступное действие.", events: agent.state().events, continuation, control: { decision: controlDecision, queries: control.state().goal.spent.queries, events: control.state().events } });
  }
  // Explicit exploratory thought, run through the existing isolated full-Prolog mechanism.
  const thinker = new WorldAgent(path.join(directory, "H1"));
  const source = thinker.observe("Исследовать структуру собственной программы без принятия новых утверждений.");
  const thought = await thinker.think(source,
    "explore :- findall(Head, (pam_item(_, _, Text), read_term_from_atom(Text, Clause, []), (Clause = (Head :- _) -> true ; Head = Clause)), Heads), length(Heads, N), format('Observed ~d clause heads: ~q~n', [N, Heads]).",
    "explore");
  episodes[0].events = thinker.state().events;
  const data = {
    version: "agent-world-poc-report-v0", question: GOAL.text,
    code_hashes: Object.fromEntries(["agent.js", "journal.js", "checker.js", "checker.pl", "scenario.js", "demo.js", "report.js", "../cognitive-memory.js", "../cognitive-runner.pl"].map(name => [name, hash(fs.readFileSync(path.join(__dirname, name), "utf8"))])),
    protocol: { source: "hand-authored synthetic episodes; no LLM extraction in this demo", same: ["goal", "current observation", "questions", "budget"], intervention: "old rule", control: "bounded missing-premise analysis", knowledgeInvariant: "snapshot hash at fixed episode time unchanged by dreaming", limitations: ["single explicit goal", "signed Horn trusted profile", "no empirical truth certification", "no claim of psyche or dream advantage", "full Prolog thought transcript is untrusted"] },
    episodes, thought: thought.payload,
    conclusion: "Прошлое изменило следующий выбор: H1 задал вопрос о резерве, H2 выбрал выпуск по независимому правилу. Контроль без сна выбрал те же действия и потребовал меньше исполнений. В этой сцене преимущество сна не показано; для обычного запуска достаточно анализа недостающих предпосылок.",
  };
  return { directory, report: writeReport(directory, data), data };
}
if (require.main === module) {
  const directory = process.argv[2] || path.join(__dirname, "../reports", `agent-world-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  demo(directory).then(r => console.log(JSON.stringify({ report: r.report, episodes: r.data.episodes.map(e => ({ history: e.label, first: e.events.find(x => x.type === "decision").payload.kind })) }, null, 2))).catch(e => { console.error(e.stack); process.exitCode = 1; });
}
module.exports = { demo };
