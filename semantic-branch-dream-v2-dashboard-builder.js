"use strict";
const fs = require("node:fs");
const path = require("node:path");
const esc = value => String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = value => esc(JSON.stringify(value, null, 2));
const read = file => fs.readFileSync(file, "utf8");
const block = (title, value, open = false) => `<details${open ? " open" : ""}><summary>${esc(title)}</summary><pre>${typeof value === "string" ? esc(value) : json(value)}</pre></details>`;
function panel(item, record, root, replay) {
  const dir = path.join(root, item.case_id);
  const request = condition => JSON.parse(read(path.join(dir, condition, "request.json")));
  const replayRow = replay.rows.find(row => row.case_id === item.case_id);
  const condition = (name, receipt, trace) => `<section class="condition"><h3>${esc(name)}</h3>${block("Exact prompt", request(name.toLowerCase()).prompt)}${block("Luna JSON answer", receipt.output, true)}${block("Alpha execution trace", trace, true)}${block("Fail-closed replay", replayRow[name.toLowerCase()])}</section>`;
  return `<details class="case"><summary><b>${esc(item.case_id)}</b> · hidden review class revealed: ${esc(item.expected_class)}</summary><div class="casebody">${block("Visible English world + question", { world: item.world, question: item.question, target_sentence_id: item.target_sentence_id }, true)}${block("Formalization prompt", request("formalization").prompt)}${block("Luna baseline program + query", record.formalization.output, true)}${block("Baseline execution", record.traces.plain.baseline)}<div class="conditions">${condition("Plain", record.plain, record.traces.plain)}${condition("Declared", record.declared, record.traces.declared)}</div></div></details>`;
}
function build({ sampleFile, rawRoot, reportFile, replayFile, outputFile }) {
  const sample = JSON.parse(read(sampleFile)), replay = JSON.parse(read(replayFile)), report = read(reportFile), provenance = JSON.parse(read(path.join(rawRoot, "provenance.json")));
  const panels = sample.cases.map(item => panel(item, JSON.parse(read(path.join(rawRoot, item.case_id, "record.json"))), rawRoot, replay)).join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>Semantic branch dream v2.1 — full alpha review</title><style>body{font:16px system-ui;margin:32px auto;max-width:1280px;color:#172033;background:#f7f8fb;line-height:1.45}.sub{color:#596579}.note{background:#eaf5ff;border-left:4px solid #2563eb;padding:12px;border-radius:6px}details{background:#fff;border:1px solid #dde3ea;border-radius:8px;margin:10px 0;padding:10px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e5eefb;padding:14px;border-radius:6px;font-size:12px}.case{border-left:5px solid #2563eb}.casebody{padding:8px}.conditions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.condition{border-left:3px solid #64748b;padding-left:12px;min-width:0}@media(max-width:850px){.conditions{grid-template-columns:1fr}}</style><h1>Сон с ветками v2.1: полный alpha-разбор</h1><p class="sub">Каждый вход, ответ, неизменяемый Prolog-кандидат и результат исполнения находятся в этом HTML. Beta ещё не проводилась.</p><div class="note"><b>Что здесь проверяется:</b> один baseline Luna, затем два равнобюджетных условия на том же baseline. Plain просит ветвиться только при неоднозначности. Declared делает то же и называет свою оценку. Независимый класс был скрыт от модели и раскрыт здесь только для review.</div><h2>Alpha conclusion and protocol</h2>${block("Alpha report", report, true)}${block("Raw provenance", provenance, true)}${block("Frozen v2.1 fixture", sample)}${block("Fail-closed replay, zero model calls", replay, true)}<h2>All cases — prompts, Luna answers, Prolog traces</h2>${panels}`;
  fs.writeFileSync(outputFile, html);
}
if (require.main === module) { const [sample, raw, report, replay, out] = process.argv.slice(2); build({ sampleFile: sample, rawRoot: raw, reportFile: report, replayFile: replay, outputFile: out }); }
module.exports = { build };
