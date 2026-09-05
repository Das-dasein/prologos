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
:root{color-scheme:light dark;--bg:#0f172a;--surface:#172033;--surface2:#202b40;--fg:#e5edf8;--muted:#9fb0c7;--good:#55d49a;--bad:#ff8b8b;--line:#33445f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:0 auto;padding:28px 18px 56px}h1{margin:0 0 5px;font-size:27px}.sub{color:var(--muted);margin:0 0 22px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px}select{background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:9px 12px;font-size:15px}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:22px}.metric,.panel,.turn{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:14px;min-width:0}.metric span,.meta{color:var(--muted);font-size:13px}.metric strong{display:block;font-size:23px;margin-top:3px;min-width:0;overflow-wrap:anywhere;word-break:break-word}.metric code{font-size:13px;font-weight:500;white-space:normal;overflow-wrap:anywhere;word-break:break-word}h2{font-size:19px;margin:22px 0 10px}.turn{margin:9px 0}.turnhead{display:flex;justify-content:space-between;gap:12px}.speaker{font-weight:650}.text{margin:8px 0 0;white-space:pre-wrap}.answer{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}.answer pre{margin:6px 0 0;white-space:pre-wrap;word-break:break-word;color:#c8d7ff;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.status{font-weight:650}.ok{color:var(--good)}.fail{color:var(--bad)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.panel{overflow:auto}code{color:#c8d7ff}button{background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 11px;cursor:pointer}@media(max-width:760px){.metrics,.grid{grid-template-columns:1fr}main{padding:22px 12px 42px}}
</style><style>.heatmap{border-collapse:collapse;width:100%;table-layout:fixed}.heatmap th,.heatmap td{padding:9px 11px;border-bottom:1px solid var(--line);text-align:left;overflow-wrap:anywhere;word-break:break-word}.heatmap th{color:var(--muted);font-size:12px;text-transform:uppercase}.heatmap td code{white-space:normal;overflow-wrap:anywhere;word-break:break-word}.heat{background:color-mix(in srgb,var(--good) calc(var(--heat)*100%),var(--bad));color:#07111f;font-weight:700;text-align:center!important;border-radius:5px}@media(max-width:760px){.query-heatmap thead{display:none}.query-heatmap,.query-heatmap tbody,.query-heatmap tr,.query-heatmap td{display:block;width:100%!important}.query-heatmap tr{border-bottom:1px solid var(--line);padding:9px 0}.query-heatmap td{border:0;padding:3px 0}.query-heatmap td:nth-child(2):before{content:'Query: ';color:var(--muted)}.query-heatmap td:nth-child(3):before{content:'Expected: ';color:var(--muted)}.query-heatmap td:nth-child(4):before{content:'Actual: ';color:var(--muted)}.query-heatmap td:nth-child(5){display:inline-block;width:auto!important;padding:5px 9px;margin-top:4px}.case-heatmap th:nth-child(2),.case-heatmap td:nth-child(2){display:none}}</style></head><body><main>
<h1>Codex + Prolog pilot dashboard</h1><p id="subtitle" class="sub"></p>
<div class="toolbar"><label for="caseSelect">Кейс:</label><select id="caseSelect"></select><button id="prev" type="button">←</button><button id="next" type="button">→</button></div>
<h2>Сводка по всем кейсам</h2><section id="overall" class="metrics"></section><h2>Heatmap по всем кейсам</h2><div id="caseHeatmap" class="panel"></div><h2>Выбранный кейс</h2><section id="metrics" class="metrics"></section><h2>Матрица B4 по категориям</h2><div id="heatmap" class="panel"></div><h2>Heatmap всех Prolog-запросов</h2><div id="queryHeatmap" class="panel"></div><section class="grid"><div><h2>Диалог и ответы модели</h2><div id="dialogue"></div></div><div><h2>Oracle и Prolog</h2><div id="oracle" class="panel"></div></div></section>
</main><script>
const DATA=${embedded}; const cases=DATA.cases; let selected=0;
const esc=value=>String(value??'∅').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pretty=value=>typeof value==='string'?value:JSON.stringify(value??null,null,2);
const select=document.getElementById('caseSelect'); cases.forEach((item,i)=>{const o=document.createElement('option');o.value=i;o.textContent=item.case_id+' · '+item.category;select.appendChild(o)});
const allRecords=cases.map(c=>c.result||{}), matched=allRecords.filter(r=>r.answer_match).length, allUsage=allRecords.flatMap(r=>r.usage||[]), avgTokens=allUsage.length?Math.round(allUsage.reduce((sum,u)=>sum+u.total_tokens,0)/allUsage.length):0;
document.getElementById('overall').innerHTML='<div class="metric"><span>Точные ответы</span><strong class="'+(matched===cases.length?'ok':'')+'">'+matched+' / '+cases.length+' ('+(matched/cases.length*100).toFixed(1)+'%)</strong></div><div class="metric"><span>Ошибки</span><strong class="'+(matched===cases.length?'ok':'fail')+'">'+(cases.length-matched)+' / '+cases.length+' ('+((cases.length-matched)/cases.length*100).toFixed(1)+'%)</strong></div><div class="metric"><span>Средний usage на ход</span><strong>'+avgTokens.toLocaleString('ru-RU')+'</strong><span>'+allUsage.length+' ходов</span></div>';
document.getElementById('caseHeatmap').innerHTML='<table class="heatmap case-heatmap"><thead><tr><th>Кейс</th><th>Категория</th><th>Query exact</th></tr></thead><tbody>'+cases.map(c=>{const ok=Boolean(c.result&&c.result.answer_match);return '<tr><td><code>'+esc(c.case_id)+'</code></td><td>'+esc(c.category)+'</td><td class="heat" style="--heat:'+(ok?1:0)+'">'+(ok?'PASS':'FAIL')+'</td></tr>'}).join('')+'<tr><th>ALL CASES</th><th>'+cases.length+' кейсов</th><th class="heat" style="--heat:'+(matched/cases.length)+'">'+matched+'/'+cases.length+' ('+(matched/cases.length*100).toFixed(1)+'%)</th></tr></tbody></table>';
function render(){const item=cases[selected], r=item.result||{}, exact=Boolean(r.answer_match); select.value=selected; document.getElementById('subtitle').textContent=(DATA.result.model||'model')+' · context '+(DATA.result.max_context_tokens||32768)+' · '+cases.length+' cases';
document.getElementById('metrics').innerHTML='<div class="metric"><span>Статус кейса</span><strong class="'+(exact?'ok':'fail')+'">'+(exact?'PASS':'FAIL')+'</strong></div><div class="metric"><span>Prolog query</span><strong><code>'+esc(r.query||item.oracle.query)+'</code></strong></div><div class="metric"><span>Ответ</span><strong><code>'+esc((r.query_answers||[]).join(' · ')||'∅')+'</code></strong></div>';
const groups={};cases.forEach(c=>{(groups[c.category]??=[]).push(c)});document.getElementById('heatmap').innerHTML='<table class="heatmap"><thead><tr><th>Категория</th><th>Кейсов</th><th>Точные ответы</th><th>Ошибки</th><th>Rate</th></tr></thead><tbody>'+Object.entries(groups).map(([category,items])=>{const matched=items.filter(c=>c.result&&c.result.answer_match).length;const rate=matched/items.length;return '<tr><td>'+esc(category)+'</td><td>'+items.length+'</td><td>'+matched+'</td><td>'+(items.length-matched)+'</td><td class="heat" style="--heat:'+rate+'">'+Math.round(rate*1000)/10+'%</td></tr>'}).join('')+'</tbody></table>';
document.getElementById('queryHeatmap').innerHTML='<table class="heatmap"><thead><tr><th>Кейс</th><th>Query</th><th>Expected</th><th>Actual</th><th>Match</th></tr></thead><tbody>'+cases.map(c=>{const r=c.result||{};const ok=Boolean(r.answer_match);return '<tr><td><code>'+esc(c.case_id)+'</code></td><td><code>'+esc(r.query||c.oracle.query)+'</code></td><td><code>'+esc((r.expected_query_answers||c.oracle.query_answers||[]).join(' · ')||'∅')+'</code></td><td><code>'+esc((r.query_answers||[]).join(' · ')||'∅')+'</code></td><td class="heat" style="--heat:'+(ok?1:0)+'">'+(ok?'PASS':'FAIL')+'</td></tr>'}).join('')+'</tbody></table>';
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
