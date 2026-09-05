"use strict";

// Build a self-contained pilot dashboard.  The generated HTML embeds the
// dataset, result, and provider raw outputs, so it remains useful after the
// temporary runner directory is gone.
const fs = require("node:fs");
const path = require("node:path");

function arg(name, fallback) {
  const argv = process.argv.slice(2);
  const inline = argv.find(value => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index < 0 ? fallback : argv[index + 1];
}

function readJsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function rawTurn(rawDir, caseId, turn) {
  if (!rawDir) return null;
  const file = path.join(rawDir, `${caseId}-turn-${turn}.json`);
  if (!fs.existsSync(file)) return null;
  const events = readJsonl(file);
  const message = events.find(event => event.type === "item.completed" && event.item && event.item.type === "agent_message");
  const completed = events.find(event => event.type === "turn.completed");
  let output = null;
  try { output = message ? JSON.parse(message.item.text) : null; } catch (_) { output = message ? message.item.text : null; }
  return { output, usage: completed && completed.usage ? completed.usage : null };
}

function buildData(dataset, result, rawDir) {
  const records = new Map((result.records || []).map(record => [record.case_id, record]));
  return dataset.map(item => ({
    case_id: item.case_id,
    category: item.category,
    dialogue: item.dialogue.map((turn, index) => ({ ...turn, turn: index + 1, provider: rawTurn(rawDir, item.case_id, index + 1) })),
    oracle: item.oracle,
    result: records.get(item.case_id) || null,
  }));
}

function html(data, result) {
  const embedded = JSON.stringify({ result, cases: data }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Codex pilot dashboard</title>
<style>
:root{color-scheme:light dark;--bg:#0f172a;--surface:#172033;--surface2:#202b40;--fg:#e5edf8;--muted:#9fb0c7;--good:#55d49a;--bad:#ff8b8b;--line:#33445f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:0 auto;padding:28px 18px 56px}h1{margin:0 0 5px;font-size:27px}.sub{color:var(--muted);margin:0 0 22px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px}select{background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:9px 12px;font-size:15px}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:22px}.metric,.panel,.turn{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:14px}.metric span,.meta{color:var(--muted);font-size:13px}.metric strong{display:block;font-size:23px;margin-top:3px}h2{font-size:19px;margin:22px 0 10px}.turn{margin:9px 0}.turnhead{display:flex;justify-content:space-between;gap:12px}.speaker{font-weight:650}.text{margin:8px 0 0;white-space:pre-wrap}.answer{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}.answer pre{margin:6px 0 0;white-space:pre-wrap;word-break:break-word;color:#c8d7ff;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.status{font-weight:650}.ok{color:var(--good)}.fail{color:var(--bad)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.panel{overflow:auto}code{color:#c8d7ff}button{background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 11px;cursor:pointer}@media(max-width:760px){.metrics,.grid{grid-template-columns:1fr}main{padding:22px 12px 42px}}
</style><style>.heatmap{border-collapse:collapse;width:100%;min-width:600px}.heatmap th,.heatmap td{padding:9px 11px;border-bottom:1px solid var(--line);text-align:left}.heatmap th{color:var(--muted);font-size:12px;text-transform:uppercase}.heat{background:color-mix(in srgb,var(--good) calc(var(--heat)*100%),var(--bad));color:#07111f;font-weight:700;text-align:center!important;border-radius:5px}</style></head><body><main>
<h1>Codex + Prolog pilot dashboard</h1><p id="subtitle" class="sub"></p>
<div class="toolbar"><label for="caseSelect">Кейс:</label><select id="caseSelect"></select><button id="prev" type="button">←</button><button id="next" type="button">→</button></div>
<section id="metrics" class="metrics"></section><h2>Матрица B4 по категориям</h2><div id="heatmap" class="panel"></div><section class="grid"><div><h2>Диалог и ответы модели</h2><div id="dialogue"></div></div><div><h2>Oracle и Prolog</h2><div id="oracle" class="panel"></div></div></section>
</main><script>
const DATA=${embedded}; const cases=DATA.cases; let selected=0;
const esc=value=>String(value??'∅').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pretty=value=>typeof value==='string'?value:JSON.stringify(value??null,null,2);
const select=document.getElementById('caseSelect'); cases.forEach((item,i)=>{const o=document.createElement('option');o.value=i;o.textContent=item.case_id+' · '+item.category;select.appendChild(o)});
function render(){const item=cases[selected], r=item.result||{}, exact=Boolean(r.answer_match); select.value=selected; document.getElementById('subtitle').textContent=(DATA.result.model||'model')+' · context '+(DATA.result.max_context_tokens||32768)+' · '+cases.length+' cases';
document.getElementById('metrics').innerHTML='<div class="metric"><span>Статус кейса</span><strong class="'+(exact?'ok':'fail')+'">'+(exact?'PASS':'FAIL')+'</strong></div><div class="metric"><span>Prolog query</span><strong><code>'+esc(r.query||item.oracle.query)+'</code></strong></div><div class="metric"><span>Ответ</span><strong><code>'+esc((r.query_answers||[]).join(' · ')||'∅')+'</code></strong></div>';
const groups={};cases.forEach(c=>{(groups[c.category]??=[]).push(c)});document.getElementById('heatmap').innerHTML='<table class="heatmap"><thead><tr><th>Категория</th><th>Кейсов</th><th>Точные ответы</th><th>Ошибки</th><th>Rate</th></tr></thead><tbody>'+Object.entries(groups).map(([category,items])=>{const matched=items.filter(c=>c.result&&c.result.answer_match).length;const rate=matched/items.length;return '<tr><td>'+esc(category)+'</td><td>'+items.length+'</td><td>'+matched+'</td><td>'+(items.length-matched)+'</td><td class="heat" style="--heat:'+rate+'">'+Math.round(rate*1000)/10+'%</td></tr>'}).join('')+'</tbody></table>';
document.getElementById('dialogue').innerHTML=item.dialogue.map(turn=>{const p=turn.provider||{};return '<article class="turn"><div class="turnhead"><span class="speaker">Ход '+turn.turn+' · '+esc(turn.speaker)+'</span><span class="meta">'+(p.usage?'input '+p.usage.input_tokens+' · output '+p.usage.output_tokens:'нет raw')+'</span></div><div class="text">'+esc(turn.text)+'</div>'+(p.output!==null&&p.output!==undefined?'<div class="answer"><span class="meta">Ответ модели</span><pre>'+esc(pretty(p.output))+'</pre></div>':'')+'</article>'}).join('');
document.getElementById('oracle').innerHTML='<p><span class="meta">Категория</span><br>'+esc(item.category)+'</p><p><span class="meta">Ожидаемый ответ</span><br><code>'+esc((r.expected_query_answers||item.oracle.query_answers||[]).join(' · ')||'∅')+'</code></p><p><span class="meta">Фактический ответ</span><br><code>'+esc((r.query_answers||[]).join(' · ')||'∅')+'</code></p><p><span class="meta">Активные claims</span><br><code>'+esc((r.active_claim_ids||[]).join(', ')||'∅')+'</code></p>';
}
select.onchange=()=>{selected=Number(select.value);render()};document.getElementById('prev').onclick=()=>{selected=(selected+cases.length-1)%cases.length;render()};document.getElementById('next').onclick=()=>{selected=(selected+1)%cases.length;render()};render();
</script></body></html>`;
}

const datasetFile = arg("dataset", ".cdr/datasets/dialogues-pilot-v1.jsonl");
const resultFile = arg("result");
const rawDir = arg("raw-output-dir");
const output = arg("output", "reports/pilot-dashboard.html");
if (!resultFile) { console.error("Usage: node pilot-dashboard.js --result <pilot-result.json> [--raw-output-dir <dir>] [--dataset <dataset.jsonl>] --output <dashboard.html>"); process.exit(1); }
const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
const data = buildData(readJsonl(datasetFile), result, rawDir);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html(data, result));
console.log(`✓ Wrote ${output} (${data.reduce((sum, item) => sum + item.dialogue.length, 0)} turns embedded)`);
