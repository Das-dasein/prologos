#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const readline = require("node:readline/promises");
const { WorldAgent } = require("./agent");
const { seed } = require("./scenario");
const { check } = require("./checker");
const { interpret } = require("./interpreter");
const { fromAssertions, fromCognitive } = require("./import");
function show(x) { console.log(JSON.stringify(x, null, 2)); }
function describe(d) {
  if (d.kind === "ask") return d.question.text;
  if (d.kind === "act") return `Выбрано действие: ${d.action}. Это запрос симулятору; результат ещё не наблюдался.`;
  if (d.kind === "await_outcome") return "Ожидается результат уже выбранного действия. Повторный запрос не создан.";
  if (d.kind === "done") return `Эпизод завершён: ${d.status}.`;
  return `Пауза: ${d.reason}. Неполученные сведения остаются неизвестными.`;
}
async function chat(agent) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Мир агента. /step, /memory, /history, /outcome success|failure, /exit. Ответ на вопрос: да / нет / не знаю.");
  try {
    console.log(describe(await agent.step({ strategy: "missing" })));
    while (true) {
      const line = (await rl.question("ты> ")).trim();
      if (line === "/exit") break;
      try {
        if (line === "/memory") { show(agent.snapshot()); continue; }
        if (line === "/history") { show(agent.state().events); continue; }
        if (line === "/step") { console.log(describe(await agent.step({ strategy: "missing" }))); continue; }
        if (line.startsWith("/outcome ")) { agent.outcome(line.slice(9).trim(), "Участник сообщил результат симуляции."); console.log("Результат записан."); continue; }
        const answer = ({ "да": "yes", "нет": "no", "не знаю": "unknown", yes: "yes", no: "no", unknown: "unknown" })[line.toLowerCase()];
        if (answer) { await agent.answer(answer, { evidenceText: line }); console.log(describe(await agent.step({ strategy: "missing" }))); continue; }
        console.log("В этой офлайн-сцене доступны явные ответы и команды. Для свободного текста используйте команду interpret: она создаст предложение для review.");
      } catch (e) { console.error(e.message); }
    }
  } finally { rl.close(); }
}
async function main(args = process.argv.slice(2)) {
  const [command, directory, ...rest] = args;
  if (!directory || command === "help") {
    console.log(`Usage: node world/cli.js COMMAND DIRECTORY [arguments]
  init DIR H1|H2               создать синтетическую биографию
  step DIR [missing|dream]     выбрать следующий шаг (по умолчанию missing)
  chat DIR                    продолжить офлайн-диалог
  answer DIR yes|no|unknown    ответить и продолжить эпизод
  outcome DIR success|failure TEXT   записать результат симуляции
  state DIR                   состояние и история
  query DIR PROLOG [TIME]      запрос к снимку без записи
  propose DIR TEXT PROLOG      явное предложение без принятия
  interpret DIR TEXT          LLM-формализация в предложение (Codex provider)
  admit DIR PROPOSAL_ID REASON явное принятие предложения оператором
  resume DIR REASON            возобновить паузу без сброса бюджета
  thought DIR FILE GOAL        отдельная свободная Prolog-мысль
  import-assertions DIR FILE TIME    импорт assertion-журнала в предложение
  import-cognitive DIR FILE TIME     импорт cognitive-снимка в предложение`);
    return;
  }
  if (command === "init") {
    if (!["H1", "H2"].includes(rest[0]) || fs.existsSync(require("node:path").join(directory, "events.jsonl"))) throw new Error("init needs a new directory and H1 or H2");
    const agent = await seed(directory, { independent: rest[0] === "H2" }); show({ directory: agent.journal.directory, status: agent.state().goal.status }); return;
  }
  const agent = new WorldAgent(directory);
  if (command === "state") return show(agent.state());
  if (command === "step") return show(await agent.step({ strategy: rest[0] || "missing" }));
  if (command === "chat") return chat(agent);
  if (command === "answer") { await agent.answer(rest[0]); return show(await agent.step({ strategy: "missing" })); }
  if (command === "outcome") return show(agent.outcome(rest[0], rest.slice(1).join(" ")));
  if (command === "query") return show(await check({ snapshot: agent.snapshot(rest[1] === undefined ? undefined : Number(rest[1])), query: rest[0] }));
  if (command === "propose") return show({ proposalId: agent.propose(agent.observe(rest[0]), [{ program: rest[1] }]) });
  if (command === "interpret") return show(await interpret(agent, rest.join(" ")));
  if (command === "admit") return show(await agent.admit(rest[0], { admit: true, by: "cli_operator", reason: rest.slice(1).join(" ") }));
  if (command === "resume") return show(agent.resume(rest.join(" ")));
  if (command === "thought") {
    const source = fs.readFileSync(rest[0], "utf8"), event = agent.observe(source, { kind: "operator_thought_program" });
    return show(await agent.think(event, source, rest[1]));
  }
  if (command === "import-assertions") return show(await fromAssertions(agent, fs.readFileSync(rest[0], "utf8"), { at: Number(rest[1]) }));
  if (command === "import-cognitive") return show(fromCognitive(agent, JSON.parse(fs.readFileSync(rest[0], "utf8")), { at: Number(rest[1]) }));
  throw new Error("unknown command; use help");
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { main, describe };
