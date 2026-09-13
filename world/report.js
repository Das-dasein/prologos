"use strict";
const fs = require("node:fs");
const path = require("node:path");
const escape = x => String(x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const json = x => escape(JSON.stringify(x, null, 2));
const labels = { ask: "Спросить о резерве", act: "Запросить выпуск", pause: "Остановиться и сохранить вопрос" };
function details(title, data) { return `<details><summary>${escape(title)}</summary><pre>${json(data)}</pre></details>`; }
function card(episode) {
  const reflection = episode.events.find(e => e.type === "reflection").payload;
  const rule = reflection.snapshot.items.find(x => x.id === "old_release_rule");
  return `<article><p class="eyebrow">${escape(episode.label)} · одна цель, другая история</p>
    <h2>${escape(labels[reflection.decision.kind])}</h2><p>${escape(episode.explanation)}</p>
    <pre class="rule">${escape(rule.program)}</pre>
    <div class="branches">${reflection.questions.flatMap(q => q.branches.map(b => `<div><span>${b.polarity === "positive" ? "Допустить: резерв готов" : "Допустить: резерв не готов"}</span><strong>${escape(b.result.safe_status)}</strong><small>${escape(b.result.status)} · ${escape(b.assumption.id)}</small></div>`)).join("")}</div>
    <p class="check">Память после сна: ${reflection.snapshot.sha256 === reflection.snapshot_after ? "не изменилась ✓" : "ИЗМЕНИЛАСЬ"}</p>
    <p>Контроль без сна: <b>${escape(labels[episode.control.decision.kind])}</b> · ${episode.control.queries} исполнение; со сном: ${reflection.cost.queries}.</p>
    ${details("Текущий вопрос, обязательства и бюджет", episode.events.find(e => e.type === "goal").payload)}
    ${details("Полный снимок памяти и исходные Prolog-программы", reflection.snapshot)}
    ${details("Обе ветви: предположения, доказательства, источники и статусы", reflection)}
    ${details("Продолжение: ответ, действие, наблюдённый результат, позднее воспоминание", episode.continuation)}
    ${details("Вся биография: источники, предложения, принятие и решения", episode.events)}
  </article>`;
}
function writeReport(directory, data) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "report.json"), `${JSON.stringify(data, null, 2)}\n`);
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Мир агента · первая сцена</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#10171c;color:#e9eee9;font:16px/1.6 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:52px 26px}h1{font-size:clamp(30px,4.2vw,54px);line-height:1.15;max-width:850px;margin:12px 0 22px}h2{font-size:27px;line-height:1.2}.eyebrow{color:#98cfae;text-transform:uppercase;letter-spacing:.1em;font-size:12px}.intro{color:#b9c8ce;max-width:900px}.scene{padding:22px 26px;border-left:3px solid #b5d7bc;background:#19232a;margin:26px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}article{min-width:0;background:#1a252c;border:1px solid #35454d;border-radius:16px;padding:25px}.rule{background:#10191f;color:#d9d8aa;min-height:104px}.branches{display:grid;gap:10px;margin-top:20px}.branches>div{border:1px solid #43535b;border-radius:8px;padding:13px}.branches strong{display:block;color:#b6ddc1}.branches small{display:block;color:#a7b6bb;overflow-wrap:anywhere}.check{color:#a8dabb}pre{padding:16px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace,monospace;max-height:650px;overflow:auto}details{border-top:1px solid #3c4a51;padding:13px 0}summary{cursor:pointer;font-size:14px}footer{color:#b3c1c7;margin-top:30px}a{color:#b7d9c1}.result{padding:24px;border:1px solid #597361;border-radius:12px;margin-top:28px}@media(max-width:820px){.grid{grid-template-columns:1fr}main{padding:28px 16px}article{padding:20px}}</style>
  <main><p class="eyebrow">Prolog agent memory / PoC v0 / воспроизводимая синтетическая сцена</p>
  <h1>Один вопрос.<br>Разное прошлое — разный выбор.</h1>
  <p class="intro">Агент хранит события, вспоминает старое правило, проверяет две возможности и выбирает следующий шаг. После сна предположения исчезают из рабочего мира, а ход исследования остаётся в биографии.</p>
  <div class="scene">${escape(data.question)}<br><small>Готовность резерва неизвестна. Цель, текущие наблюдения, вопрос о резерве и бюджеты в обеих историях совпадают.</small></div>
  <div class="grid">${data.episodes.map(card).join("")}</div>
  <div class="result"><b>Что показал этот запуск</b><p>${escape(data.conclusion)}</p></div>
  ${details("Протокол и границы результата", data.protocol)}
  ${details("Отдельная свободная Prolog-мысль: программа и недоверенный transcript", data.thought)}
  <footer>Результаты выпуска в сцене поступают от симулятора. Логический вывод не удостоверяет истинность исходных утверждений. <a href="report.json">Полный JSON-артефакт</a></footer></main></html>`;
  fs.writeFileSync(path.join(directory, "index.html"), html); return path.join(directory, "index.html");
}
module.exports = { writeReport };
