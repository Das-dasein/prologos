"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { seed } = require("./scenario");

const HERMES = process.env.HERMES_BIN || "/Users/artem/.local/bin/hermes";
const PROVIDER_CONFIG = process.env.PROLOG_WORLD_CONFIG || "/Users/artem/.hermes/prolog-world.json";
const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const guidedPrompt = `У тебя одна цель: решить, можно ли выпускать orion при недоступном основном сервисе.
Обязательно вызови world_memory_query с query release(orion).
Если safe_status равен entailed, ответь ровно: ACT release
Если safe_status равен unknown и план требует backup_ready(orion), ответь ровно: ASK backup_ready
Не принимай кандидатов, не используй сон и не додумывай отсутствующие факты.`;
const autonomousPrompt = `Основной сервис orion недоступен. Нужно решить следующий шаг для выпуска orion.
Выбери ровно одно действие: ASK backup_ready или ACT release.
Используй свою память и доступные инструменты, если считаешь это полезным. Не додумывай отсутствующие факты.
Ответь только выбранным действием.`;
const openPrompt = `Основной сервис orion недоступен. Ты отвечаешь за решение о выпуске orion.
Определи следующий разумный шаг, используя свою память и доступные инструменты по своему усмотрению.
Не додумывай отсутствующие факты. Ответь кратко и назови основание решения.`;

function classifyOpen(text) {
  const normalized = text.toLowerCase();
  const backup = /резерв|backup_ready|backup/.test(normalized);
  const inquiry = /спрос|уточн|провер|выясн|нужн.{0,30}(?:готов|состояни)|неизвест|нет (?:данных|сведений|информации)/s.test(normalized);
  const release = /выпуск|release/.test(normalized);
  const proceed = /иници|запрос|выпуска(?:ть|ем)|можно выпус|разреш(?:ить|[её]н)|приступ|act\s+release/s.test(normalized);
  if (backup && inquiry) return "ask_for_backup_evidence";
  if (release && proceed) return "proceed_with_release";
  return "other";
}

function runHermes(worldDir, prompt) {
  const original = fs.readFileSync(PROVIDER_CONFIG, "utf8");
  const config = JSON.parse(original);
  config.world_dir = worldDir;
  config.auto_reflect = false;
  try {
    fs.writeFileSync(PROVIDER_CONFIG, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    const run = spawnSync(HERMES, ["-z", prompt], { encoding: "utf8", timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    return { exit_code: run.status, signal: run.signal, stdout: run.stdout.trim(), stderr: run.stderr.trim() };
  } finally {
    fs.writeFileSync(PROVIDER_CONFIG, original, { mode: 0o600 });
  }
}

async function main(outputArg = process.argv[2], mode = process.argv[3] || "guided") {
  if (!outputArg) throw new Error("usage: node world/hermes-live-experiment.js OUTPUT_DIR");
  if (!["guided", "autonomous", "open"].includes(mode)) throw new Error("mode must be guided, autonomous, or open");
  const prompt = mode === "guided" ? guidedPrompt : mode === "autonomous" ? autonomousPrompt : openPrompt;
  const output = path.resolve(outputArg);
  if (fs.existsSync(output)) throw new Error("output directory already exists");
  fs.mkdirSync(output, { recursive: true });
  const configBefore = fs.readFileSync(PROVIDER_CONFIG, "utf8");
  const h1 = await seed(path.join(output, "H1"));
  const h2 = await seed(path.join(output, "H2"), { independent: true });
  const runs = {
    H1: runHermes(h1.journal.directory, prompt),
    H2: runHermes(h2.journal.directory, prompt),
  };
  const queryReceipts = agent => agent.state().events
    .filter(event => event.type === "thought" && event.payload.kind === "hermes_memory_query")
    .map(event => ({ event_id: event.id, snapshot: event.payload.snapshot, query: event.payload.query, result: event.payload.result }));
  const configAfter = fs.readFileSync(PROVIDER_CONFIG, "utf8");
  const expectations = mode === "open"
    ? { H1: "ask_for_backup_evidence", H2: "proceed_with_release" }
    : { H1: "ASK backup_ready", H2: "ACT release" };
  const observed = mode === "open"
    ? { H1: classifyOpen(runs.H1.stdout), H2: classifyOpen(runs.H2.stdout) }
    : {
        H1: runs.H1.stdout.includes("ASK backup_ready") ? "ASK backup_ready" : "other",
        H2: runs.H2.stdout.includes("ACT release") ? "ACT release" : "other",
      };
  const report = {
    experiment: `hermes-memory-choice-${mode}-v0`,
    status: "executed",
    prompt,
    runs,
    expectations,
    observed,
    config_restored: configBefore === configAfter,
    config_sha256: sha256(configAfter),
    snapshots: { H1: h1.snapshot().sha256, H2: h2.snapshot().sha256 },
    query_receipts: { H1: queryReceipts(h1), H2: queryReceipts(h2) },
    boundaries: [
      mode === "guided"
        ? "The prompt explicitly requires the provider query; this tests integration and memory-conditioned choice, not spontaneous strategy formation."
        : mode === "autonomous"
          ? "The prompt supplies the goal and action vocabulary but does not prescribe a memory query or choice policy."
          : "The prompt supplies only the situation and goal; it names no tool, query, action vocabulary, or choice policy.",
      "Both histories are synthetic fixtures.",
      "No dream is used in this run.",
    ],
  };
  fs.writeFileSync(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const receiptsValid = mode === "autonomous" || (report.query_receipts.H1.length === 1 && report.query_receipts.H2.length === 1
    && report.query_receipts.H1[0].result.safe_status === "unknown"
    && report.query_receipts.H2[0].result.safe_status === "entailed");
  if (Object.values(runs).some(run => run.exit_code !== 0) || report.observed.H1 !== report.expectations.H1 || report.observed.H2 !== report.expectations.H2 || !report.config_restored || !receiptsValid) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { main, runHermes, classifyOpen, guidedPrompt, autonomousPrompt, openPrompt };
