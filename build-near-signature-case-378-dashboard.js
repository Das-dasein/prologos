"use strict";

// Deterministic, model-free replay of a persisted candidate.  The certificate
// comes from finite-fol-meta-prover.pl through the ordinary checker.
const crypto = require("node:crypto");
const fs = require("node:fs");
const { checkCandidate } = require("./candidate-checker");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const programFile = "reports/luna-thirty-error-probes/case-378-baseline.pl";
const sourceFile = "reports/luna-thirty-error-probes/source-excerpts.json";
const outputFile = "reports/near-signature-case-378-replay.json";
const dashboardFile = "near-signature-case-378-dashboard.html";

async function main() {
  const program = fs.readFileSync(programFile, "utf8");
  const source = JSON.parse(fs.readFileSync(sourceFile, "utf8")).records.find(record => record.id === 378);
  if (!source) throw new Error("case 378 source excerpt absent");
  const query = "not(receives_accolades(clark))";
  const result = await checkCandidate({ caseId: "case-378-near-signature-replay", program, query, timeoutMs: 4000, maxOutputBytes: 262144 });
  const sentences = Object.entries(source.nl2fol).map(([text, fol], index) => ({ id: `s${index + 1}`, text, source_nl2fol: fol }));
  const receipt = Object.freeze({
    schema_version: "near-signature-case-378-replay-v1",
    status: "observed-model-free-replay-not-cdr-result",
    boundaries: "One persisted candidate was executed in a fresh process. No model was called; no predicate was renamed; no axiom was added. This demonstrates diagnostic visibility, not answer accuracy or memory benefit.",
    source: { case_id: 378, program_file: programFile, program_sha256: sha256(program), source_excerpt_file: sourceFile, source_excerpt_sha256: sha256(fs.readFileSync(sourceFile, "utf8")), original_question: source.question, dataset_answer_label: source.answer },
    source_sentences: sentences,
    candidate: { program, query, candidate_sha256: result.candidate_sha256 },
    execution: { outcome: result.execution_outcome, bindings: result.bindings }
  });
  fs.writeFileSync(outputFile, JSON.stringify(receipt, null, 2) + "\n");
  const sources = sentences.map(sentence => `<li><b>${sentence.id}</b> ${escapeHtml(sentence.text)}<br><code>${escapeHtml(sentence.source_nl2fol)}</code></li>`).join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>Case 378: metaprogramming audit</title><style>body{max-width:1160px;margin:32px auto;padding:0 18px;font:16px/1.5 system-ui;color:#172033;background:#fafafa}section{background:#fff;border:1px solid #d8dee9;border-radius:10px;padding:18px;margin:18px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e5edf7;padding:14px;border-radius:7px}code{overflow-wrap:anywhere}.warn{border-left:5px solid #d97706;padding-left:12px}li{margin:.75em 0}</style><h1>Case 378: мета-Prolog аудит имён</h1><section class="warn"><b>Граница результата.</b> Это один воспроизводимый запуск уже сохранённого кандидата. Вызовов модели не было. Prolog не переименовывал предикаты, не добавлял <code>scientist(clark)</code> и не менял ответ. Поэтому это не эксперимент о качестве модели и не результат CDR.</section><section><h2>Исходный вопрос</h2><p>${escapeHtml(source.question)}</p><p>Метка датасета: <code>${source.answer}</code>. Она показана для контекста и не использовалась при запуске.</p></section><section><h2>Все 25 исходных предложений и pinned nl2fol</h2><ol>${sources}</ol></section><section><h2>Неизменённый кандидат</h2><p>SHA-256: <code>${receipt.candidate.candidate_sha256}</code></p><pre>${escapeHtml(program)}</pre><h3>Query</h3><pre>${escapeHtml(query)}</pre></section><section><h2>Результат свежего Prolog запуска</h2><p>Outcome: <code>${result.execution_outcome}</code></p><pre>${escapeHtml(result.bindings)}</pre><p>В сертификате видны: query-пара <code>receives_accolades/1 → receive_accolades/1</code> с <code>s1</code>; внутренние пары <code>develop_new_techniques/develops_new_techniques</code> с <code>s12</code> против <code>s11,s18</code> и <code>improve/improves_existing_processes</code> с <code>s2,s5</code> против <code>s19</code>.</p></section>`;
  fs.writeFileSync(dashboardFile, html);
  console.log(JSON.stringify({ receipt: outputFile, dashboard: dashboardFile, outcome: result.execution_outcome, candidate_sha256: result.candidate_sha256 }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
