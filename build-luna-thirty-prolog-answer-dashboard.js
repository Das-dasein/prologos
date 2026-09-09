"use strict";

const fs = require("node:fs");
const path = require("node:path");
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));
const pretty = value => JSON.stringify(value, null, 2);
const detail = (title, value, open = false) => `<details${open ? " open" : ""}><summary>${esc(title)}</summary><pre>${esc(typeof value === "string" ? value : pretty(value))}</pre></details>`;

function pamLines(transcript) { return String(transcript || "").split(/\r?\n/).filter(line => line.startsWith("PAM_DIAGNOSTIC_")).join("\n") || "No diagnostic lines"; }
function stage(root, id, name) {
  const directory = path.join(root, `case-${id}`, name);
  return { request: json(path.join(directory, "request.json")), receipt: json(path.join(directory, "receipt.json")), final: fs.existsSync(path.join(directory, "final.txt")) ? read(path.join(directory, "final.txt")) : "No final.txt" };
}
function modelBlock(title, value) {
  return `<section class="model"><h4>${esc(title)}</h4>${detail("Exact prompt", value.request.prompt)}${detail("Raw final answer", value.final, true)}${detail("Receipt", value.receipt)}</section>`;
}
function build({ sourceRoot, executionRoot, wave }) {
  const score = json(path.join(executionRoot, "results-scored.json"));
  const cases = json(path.join(wave, "cases.json"));
  const sourceById = new Map(cases.map(item => [item.id, item]));
  const rows = score.rows.map(row => {
    const source = sourceById.get(row.source_id);
    const original = json(path.join(sourceRoot, `case-${row.source_id}`, "record.json"));
    const rerun = json(path.join(executionRoot, `case-${row.source_id}.json`));
    return { row, source, original, rerun };
  });
  const cards = rows.map(({ row, source, original, rerun }) => {
    const prolog = pamLines(rerun.observation.runtime?.transcript?.transcript);
    const verdict = row.answer === null ? "неразрешённый" : row.answer;
    return `<article class="${row.correct ? "ok" : "bad"}"><h2>${row.source_id}: Prolog ${esc(verdict)} · gold ${esc(row.gold)} · ${row.correct ? "совпало" : "не совпало"}</h2>
${detail("Исходный текст и вопрос", `Context:\n${source.context}\n\nQuestion:\n${source.question}`, true)}
${modelBlock("Луна: формализация (замороженная)", stage(sourceRoot, row.source_id, "formalization"))}
${detail("Неизменённые программа и старый запрос", `Program:\n${rerun.program}\n\nSaved diagnostic query:\n${rerun.query}\n\nNew trusted query:\n${rerun.observation.query}`, true)}
${detail("Prolog: ответ и полный сертификат", prolog, true)}
${modelBlock("Луна M1: читала программу без исполнения", stage(sourceRoot, row.source_id, "M1"))}
${modelBlock("Луна M2: видела старый вывод исполнения", stage(sourceRoot, row.source_id, "M2"))}
</article>`;
  }).join("\n");
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Luna30: Prolog final answer</title><style>
body{font:16px/1.45 system-ui,sans-serif;max-width:1150px;margin:32px auto;padding:0 20px;background:#f6f7fb;color:#17202a}h1{margin-bottom:4px}article{background:white;border-left:7px solid #bdc3c7;margin:18px 0;padding:16px;border-radius:8px}.ok{border-color:#239b56}.bad{border-color:#c0392b}details{margin:10px 0;border:1px solid #d7dce3;border-radius:6px;padding:8px}summary{cursor:pointer;font-weight:650}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#111827;color:#e5e7eb;padding:12px;border-radius:5px;max-height:550px;overflow:auto}.model{padding:8px 12px;margin:12px 0;background:#f8fafc;border-radius:6px}.callout{background:#fff6db;border-left:5px solid #d69e2e;padding:12px;border-radius:5px}table{border-collapse:collapse;background:white}td,th{padding:8px 12px;border:1px solid #cbd5e1;text-align:left}</style><body>
<h1>30 исходных ProverQA задач: букву решает Prolog</h1>
<p>Формализации заморожены из прежнего Luna30. Новых вызовов модели: <b>0</b>. Gold открылся только после 30 исполнений.</p>
<table><tr><th>Метрика</th><th>Значение</th></tr><tr><td>Совпадений с gold</td><td>${score.correct}/${score.planned} (${(score.accuracy_all_planned * 100).toFixed(1)}%)</td></tr><tr><td>Разрешено Prolog</td><td>${score.resolved}/30</td></tr><tr><td>Неразрешено</td><td>${esc(score.unresolved.join(", "))}</td></tr></table>
<p class="callout">Это совпадает с прежним M2: 17/30. Значит, M2 не была дополнительным логическим решателем: она корректно транскрибировала статус Prolog в пяти случаях. Ограничение осталось прежним: результат измеряет качество замороженной формализации на отладочной выборке, а не общую точность системы.</p>
${cards}</body></html>`;
  fs.writeFileSync(path.join(executionRoot, "dashboard.html"), html, { flag: "wx", mode: 0o600 });
}

if (require.main === module) {
  const wave = path.join(__dirname, ".cdr", "waves", "luna-thirty-paired-v1");
  const executionRoot = path.join(__dirname, ".cdr", "waves", "luna-thirty-prolog-answer-v1", "raw-prolog-answer-v1");
  build({ sourceRoot: path.join(wave, "raw-r1-verdicts"), executionRoot, wave });
}
module.exports = { build, pamLines };
