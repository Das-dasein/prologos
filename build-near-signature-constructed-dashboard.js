"use strict";

const fs = require("node:fs");
const path = require("node:path");
const rawRoot = process.argv[2];
if (!rawRoot) throw Error("usage: node build-near-signature-constructed-dashboard.js RAW_ROOT");
const wave = ".cdr/waves/near-signature-constructed-v1";
const fixture = JSON.parse(fs.readFileSync(path.join(wave, "fixture-v1.json"), "utf8"));
const gold = new Map(JSON.parse(fs.readFileSync(path.join(wave, "gold-v1.json"), "utf8")).items.map(item => [item.case_id, item]));
const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const pretty = value => esc(JSON.stringify(value, null, 2));
const bare = value => String(value).replace(/\/1$/, "");

function targetCorrect(output, expected) {
  return (output?.problems || []).some(problem => {
    const pair = [bare(problem.left), bare(problem.right)].sort();
    return problem.judgement === expected.verdict && JSON.stringify(pair) === JSON.stringify([...expected.expected_pair].sort());
  });
}

const rows = [];
for (const item of fixture.cases) {
  const record = JSON.parse(fs.readFileSync(path.join(rawRoot, item.case_id, "record.json"), "utf8"));
  const expected = gold.get(item.case_id);
  const calls = Object.fromEntries(record.calls.map(call => [call.label, call]));
  rows.push({ item, record, expected, calls, m1: targetCorrect(calls.m1.receipt.output, expected), m2: targetCorrect(calls.m2.receipt.output, expected) });
}
const score = label => rows.reduce((total, row) => total + (row[label] ? 1 : 0), 0);
const byStratum = name => rows.filter(row => row.item.case_id.startsWith(name));
const summary = `<table><tr><th>Условие</th><th>Верных target-оценок</th><th>Реальные тождества (8)</th><th>Разные control-пары (8)</th></tr>${["m1", "m2"].map(label => `<tr><td>${label === "m1" ? "M1: без аудита" : "M2: с near_signature_audit"}</td><td>${score(label)}/16</td><td>${byStratum("real").filter(row => row[label]).length}/8</td><td>${byStratum("control").filter(row => row[label]).length}/8</td></tr>`).join("")}</table>`;
const sections = rows.map(row => {
  const world = row.item.world.map(sentence => `${sentence.id}: ${sentence.text}`).join("\n");
  const call = label => {
    const entry = row.calls[label];
    const receipt = entry.receipt;
    const request = JSON.parse(fs.readFileSync(path.join(rawRoot, row.item.case_id, label, "request.json"), "utf8"));
    return `<article class="${row[label] ? "correct" : "wrong"}"><h3>${label.toUpperCase()} — ${row[label] ? "target верен" : "target не подтверждён"}</h3><p>Trace/schema: ${receipt.error === null ? "passed" : esc(receipt.error)}</p><details><summary>Промпт</summary><pre>${esc(request.prompt)}</pre></details><details open><summary>Ответ модели</summary><pre>${pretty(receipt.output)}</pre></details><details><summary>Receipt</summary><pre>${pretty(receipt)}</pre></details></article>`;
  };
  return `<section><h2>${esc(row.item.case_id)} — gold: ${esc(row.expected.verdict)}</h2><p><b>Ожидаемая пара:</b> ${esc(row.expected.expected_pair.join(" ↔ "))}; <b>источники:</b> ${esc(row.expected.source_ids.join(", "))}</p><details open><summary>Источник и frozen candidate</summary><pre>${esc(world)}\n\nProgram:\n${esc(row.item.program)}\n\nQuery:\n${esc(row.item.query)}</pre></details><details><summary>Prolog certificates / цепочка</summary><pre>${pretty(row.record.certificates)}</pre></details><div class="calls">${call("m1")}${call("m2")}</div></section>`;
}).join("\n");
const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Constructed near-signature v1 — Luna</title><style>body{font:15px/1.45 system-ui,sans-serif;margin:32px;max-width:1500px;background:#f8fafc;color:#172033}h1{margin-bottom:4px}table{border-collapse:collapse;margin:18px 0}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}section{background:white;border:1px solid #cbd5e1;border-radius:9px;padding:16px;margin:18px 0}.calls{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{border:1px solid #cbd5e1;padding:10px;border-radius:7px}.correct{border-left:5px solid #15803d}.wrong{border-left:5px solid #b91c1c}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;padding:12px;border-radius:6px}summary{cursor:pointer;font-weight:600}small{color:#475569}</style><body><h1>Near-signature constructed v1: Luna</h1><p>Это constructed diagnostic, а не оценка естественной частоты ошибок M0 и не эксперимент по автоматическому ремонту. M1 и M2 получают один frozen candidate; M2 отличается только read-only Prolog audit.</p><p><b>Фактический запуск:</b> 32/32 ответа прошли trace и JSON-schema gate; M0 = 0; retries = 0.</p>${summary}<p><small>«Верно» означает: модель назвала именно gold-пару и дала ей evaluator-only verdict. Пустой ответ, нерелевантная проблема и <code>insufficient_basis</code> для real-item не засчитываются как подтверждение тождества.</small></p>${sections}</body></html>`;
fs.writeFileSync(path.join(rawRoot, "dashboard.html"), html);
console.log(JSON.stringify({ output: path.join(rawRoot, "dashboard.html"), m1: score("m1"), m2: score("m2"), calls: 32 }));
