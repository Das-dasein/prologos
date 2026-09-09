"use strict";

// This is an engineering audit of already persisted candidates.  It does not
// execute them, call a model, change a candidate, or create aliases.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { auditPredicateNames } = require("./predicate-lexical-audit");

const INPUT_ROOT = ".cdr/waves/llm-metaprolog-chain-memory-v1";
const OUTPUT_ROOT = ".cdr/waves/predicate-lexical-audit-v1";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function files(root) { return fs.readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name)).flatMap(entry => entry.isDirectory() ? files(path.join(root, entry.name)) : entry.name.endsWith(".json") ? [path.join(root, entry.name)] : []); }
function findCandidates(value, trail = []) {
  if (!value || typeof value !== "object") return [];
  const found = typeof value.program === "string" && typeof value.query === "string" ? [{ program: value.program, query: value.query, location: trail.join(".") || "root" }] : [];
  return found.concat(...Object.entries(value).flatMap(([key, child]) => findCandidates(child, trail.concat(key))));
}
function manualAssessment(suggestions) {
  const pair = suggestions.map(s => `${s.left}/${s.right}`).join(", ");
  if (pair === "enjoy_hiking/enjoys_hiking" || pair === "expand_territory/expands_territory") return "Похоже на расхождение имени предметного отношения между программой и запросом. Сверить с исходным текстом; не заменять автоматически.";
  if (pair === "or_f/xor_f") return "Вспомогательные обозначения разных связок. Это не опечатка и не кандидат на замену.";
  if (pair === "s2_or/s5_or") return "Технические идентификаторы разных предложений. Это не опечатка и не кандидат на замену.";
  return "Требует ручной сверки с исходным текстом; инструмент не делает вывода о правильности.";
}
function render(report) {
  const pairs = Object.entries(report.suggestion_pair_counts).map(([pair, count]) => `<li><code>${escapeHtml(pair.replace("~", " ↔ "))}</code>: ${count} уникальных кандидатов</li>`).join("");
  const rows = report.flagged.map((item, index) => `<article><h2>${index + 1}. ${escapeHtml(item.suggestions.map(s => `${s.left} ↔ ${s.right}`).join(", "))}</h2><p><b>Ручная оценка:</b> ${escapeHtml(item.manual_assessment)}</p><p><b>SHA-256:</b> <code>${item.candidate_sha256}</code><br><b>Первое вхождение:</b> <code>${escapeHtml(item.locations[0])}</code><br><b>Повторов этой точной пары:</b> ${item.locations.length}</p><details open><summary>Неизменённая программа и запрос</summary><h3>Program</h3><pre>${escapeHtml(item.program)}</pre><h3>Query</h3><pre>${escapeHtml(item.query)}</pre><h3>Все местоположения</h3><pre>${escapeHtml(item.locations.join("\n"))}</pre></details></article>`).join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Аудит похожих имён предикатов</title><style>body{max-width:1100px;margin:32px auto;padding:0 18px;font:16px/1.5 system-ui;color:#172033;background:#fafafa}article{background:#fff;border:1px solid #d8dee9;border-radius:10px;padding:18px;margin:18px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e5edf7;padding:14px;border-radius:7px}code{overflow-wrap:anywhere}summary{cursor:pointer;font-weight:650}.warn{border-left:5px solid #d97706;padding-left:12px}</style><h1>Аудит похожих имён предикатов</h1><p class="warn"><b>Это не эксперимент и не исправление модели.</b> Инструмент только нашёл пары имён с расстоянием Левенштейна ≤ 1 в уже сохранённых кандидатах. Ничего не запускалось, не переименовывалось и не добавлялось в память.</p><p>Область: <code>${INPUT_ROOT}</code>. Прочитано JSON-файлов: ${report.input_json_files}; вложенных записей <code>program + query</code>: ${report.nested_candidate_records}; уникальных точных пар: ${report.unique_candidates}; помечено: ${report.flagged.length}.</p><p><b>Сводка совпадений:</b></p><ul>${pairs}</ul><p>Вывод: подсказка действительно находит два правдоподобных расхождения предметных имён. Но она также ловит два класса технического шума: имена внутренних связок и идентификаторы предложений. Поэтому её правильное место — только в диагностике рядом с кандидатом, с ручным решением человека или модели по исходному тексту. Автозамена здесь была бы костылём.</p>${rows}`;
}
const byHash = new Map(); let nested = 0; const inputFiles = files(INPUT_ROOT);
for (const file of inputFiles) {
  let data; try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
  for (const candidate of findCandidates(data)) {
    nested += 1;
    const hash = sha256(`${candidate.program}\n--query--\n${candidate.query}`);
    const entry = byHash.get(hash) || { candidate_sha256: hash, program: candidate.program, query: candidate.query, locations: [] };
    entry.locations.push(`${file}#${candidate.location}`); byHash.set(hash, entry);
  }
}
const flagged = [...byHash.values()].map(item => ({ ...item, suggestions: auditPredicateNames(item).suggestions })).filter(item => item.suggestions.length).map(item => ({ ...item, manual_assessment: manualAssessment(item.suggestions) })).sort((left, right) => left.candidate_sha256.localeCompare(right.candidate_sha256));
const suggestion_pair_counts = {};
for (const item of flagged) for (const suggestion of item.suggestions) { const pair = `${suggestion.left}~${suggestion.right}`; suggestion_pair_counts[pair] = (suggestion_pair_counts[pair] || 0) + 1; }
const report = Object.freeze({ schema_version: "predicate-lexical-historical-audit-v1", status: "engineering-diagnostic-not-executed", input_root: INPUT_ROOT, input_json_files: inputFiles.length, nested_candidate_records: nested, unique_candidates: byHash.size, suggestion_pair_counts, flagged });
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_ROOT, "report.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync("predicate-lexical-audit-dashboard.html", render(report));
console.log(JSON.stringify({ unique_candidates: report.unique_candidates, flagged: report.flagged.length, report: path.join(OUTPUT_ROOT, "report.json"), dashboard: "predicate-lexical-audit-dashboard.html" }, null, 2));
