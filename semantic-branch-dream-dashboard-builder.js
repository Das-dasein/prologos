"use strict";
// Produces a self-contained review dashboard from local diagnostic raw output.
const fs = require("node:fs");
const path = require("node:path");
const esc = value => String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = value => esc(JSON.stringify(value, null, 2));
const read = file => fs.readFileSync(file, "utf8");
function block(title, value, open = false) { return `<details${open ? " open" : ""}><summary>${esc(title)}</summary><pre>${typeof value === "string" ? esc(value) : json(value)}</pre></details>`; }
function casePanel(record, root) {
  const dir = path.join(root, record.case_id);
  const formalRequest = JSON.parse(read(path.join(dir, "formalization", "request.json")));
  const hypothesisRequest = JSON.parse(read(path.join(dir, "hypotheses", "request.json")));
  const trace = record.trace || {};
  const branches = (trace.branches || []).map(branch => `<article class="branch"><h4>${esc(branch.id)} · ${esc(branch.kind)} · ${esc(branch.semantic_status || branch.status || "unreported")}</h4>${branch.rejection ? `<p class="bad">Rejected: ${esc(branch.rejection)}</p>` : ""}${block("Model hypothesis (complete candidate)", branch.hypothesis, true)}${block("Prolog execution", { execution_outcome: branch.execution_outcome, semantic_status: branch.semantic_status, bindings: branch.bindings, transcript: branch.transcript })}</article>`).join("");
  return `<details class="case"><summary><b>${esc(record.case_id)}</b> · ${esc(record.class)} · final trace: <b>${esc(trace.conclusion || "missing")}</b></summary><section class="casebody">${block("Visible English world + question", { world: record.world, question: record.question }, true)}${block("Formalization prompt sent to Luna", formalRequest.prompt)}${block("Luna formalization answer", record.formalization.output, true)}${block("Hypothesis prompt sent to Luna", hypothesisRequest.prompt)}${block("Luna hypothesis answer", record.hypotheses.output, true)}${block("Baseline Prolog execution", trace.baseline)}<h3>Branches</h3>${branches || "<p>No branches.</p>"}</section></details>`;
}
function build({ sampleFile, rawRoot, reportFile, outputFile }) {
  const sample = JSON.parse(read(sampleFile));
  const records = sample.cases.map(item => {
    const record = JSON.parse(read(path.join(rawRoot, item.case_id, "record.json")));
    return { ...record, world: item.world, question: item.question };
  });
  const report = read(reportFile);
  const provenance = JSON.parse(read(path.join(rawRoot, "provenance.json")));
  const body = records.map(record => casePanel(record, rawRoot)).join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>Semantic branch dream — full v1 review</title><style>body{font:16px system-ui;margin:32px auto;max-width:1200px;color:#172033;background:#f7f8fb;line-height:1.45}h1{margin-bottom:4px}.sub{color:#596579}.note{background:#fff4e5;border-left:4px solid #d97706;padding:12px;border-radius:6px}details{background:white;border:1px solid #dde3ea;border-radius:8px;margin:10px 0;padding:10px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e5eefb;padding:14px;border-radius:6px;font-size:12px}.case{border-left:5px solid #9f1239}.casebody{padding:8px}.branch{border-left:3px solid #64748b;padding-left:12px;margin:12px 0}.bad{color:#9f1239;font-weight:700}code{background:#e7edf5;padding:2px 4px;border-radius:3px}</style><h1>Сон с ветками: полный разбор v1</h1><p class="sub">Самодостаточный локальный отчёт: полный вход Luna, её JSON-ответы, неизменяемые Prolog-кандидаты и результаты каждого изолированного исполнения.</p><div class="note"><b>Статус REVISE.</b> v1 не проверил распознавание неоднозначности, потому что промпт приглашал строить контрфактические OR/XOR-ветки, но не требовал воздержания на явных контролях. Это видно в каждом раскрывающемся кейсе ниже.</div><h2>Метод и итоговая интерпретация</h2>${block("Diagnostic report", report, true)}${block("Raw-run provenance", provenance, true)}${block("Frozen sample", sample)}<h2>Все восемь кейсов</h2>${body}`;
  fs.writeFileSync(outputFile, html);
}
if (require.main === module) {
  const [sampleFile, rawRoot, reportFile, outputFile] = process.argv.slice(2);
  if (!outputFile) throw new Error("usage: sample.json raw-dir report.md dashboard.html");
  build({ sampleFile, rawRoot, reportFile, outputFile });
}
module.exports = { build };
