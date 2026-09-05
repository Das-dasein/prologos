'use strict';
const DATA=JSON.parse(document.getElementById('dashboard-data').textContent);
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cases=DATA.cases;
const live=DATA.result.schema_version==='prolog-memory-pilot-v2';
let selected=Math.max(0,cases.findIndex(c=>c.case_id==='ambiguity-02'));
function openView(name){for(const v of ['stats','cases']){el(v+'-view').hidden=v!==name;el(v+'-nav').setAttribute('aria-pressed',String(v===name));}}
function exact(c){return live?c.result.scoring.answer_exact.numerator===1:c.result?.answer_match;}
function block(title,text){return '<div><h3>'+esc(title)+'</h3><pre>'+esc(text)+'</pre></div>';}
function json(v){return JSON.stringify(v,null,2);}
function fact(a){return (a.polarity==='negative'?'negative: ':'positive: ')+a.relation+'('+a.arguments.join(', ')+') · '+(a.valid_from??'начало не указано')+' … '+(a.valid_to??'конец не указан');}
function list(){const q=el('case-search').value.toLowerCase();el('case-list').innerHTML=cases.map((c,i)=>({c,i})).filter(({c})=>(!el('only-errors').checked||exact(c)===false)&&(c.case_id+' '+(c.analysis?.title||'')+' '+c.dialogue.map(t=>t.text).join(' ')).toLowerCase().includes(q)).map(({c,i})=>'<button data-case="'+i+'" aria-current="'+(i===selected)+'"><span>'+esc(c.case_id)+'<br><small>'+esc(c.analysis?.title||'Открыть сравнение')+'</small></span></button>').join('');}
function render(){const c=cases[selected];const r=c.result;const p=r.memory_context?.prolog;
const answer=live?r.answer.text:null;
el('case-detail').innerHTML='<h2>'+esc(c.case_id)+'</h2><p>'+esc(c.dialogue.at(-1)?.text)+'</p>'+(c.analysis?'<section class="analysis"><h3>'+esc(c.analysis.title)+'</h3><p>'+esc(c.analysis.explanation)+'</p><small>Качественный разбор Codex по сохранённым данным; исходная оценка не изменена.</small></section>':'')+'<section class="comparison"><h3>1. Ожидание и ответ модели</h3><div class="answers">'+block('Слева — эталон ответа',c.expected_answer?.expected||'В старом отчёте есть только эталон Prolog')+block('Справа — дословный ответ модели',answer??'Финальный ответ этого запуска не сохранён')+'</div><p class="muted">Оценка исходного кода: exact = '+esc(exact(c))+' (сравнение строк, не оценка смысла).</p></section><section class="comparison"><h3>2. Что вернул Prolog</h3><code>'+esc(p?.query||c.oracle.query)+'</code><pre>'+esc(json(p?.answers??r.query_answers))+'</pre><details><summary>Символьный эталон (ID эталона могут отличаться от runtime ID)</summary><pre>'+esc(json(c.oracle.query_answers))+'</pre></details></section><h2>3. Как текст превратился в факты</h2>'+c.dialogue.map(t=>{const got=t.provider?.output;const gold=(c.gold_operations||[]).filter(o=>o.turn===t.turn&&o.kind==='write').map(o=>o.proposal);return '<section class="turn"><p>Ход '+t.turn+': '+esc(t.text)+'</p><div class="answers">'+block('Эталон извлечения',gold.length?gold.map(fact).join('\n'):'Нет записи')+block('Модель извлекла',got?got.assertions.map(fact).join('\n')||'Нет записи':'Нет сохранённого ответа')+'</div><details><summary>Полный JSON ответа извлечения</summary><pre>'+esc(json(got))+'</pre></details></section>';}).join('')+'<details><summary>Исходный контекст и оценки этого кейса</summary><pre>'+esc(json(r))+'</pre></details>';list();}
el('run-info').textContent=[DATA.result.model,'B4',cases.length+' кейсов',live?'Прогон 05.09.2026 15:20:59 · v2':'Исторический v1'].join(' · ');
el('boundary').textContent=DATA.result.review?.method||'Исторический отчёт';
const metrics=DATA.result.matrixB.B4;
el('totals').innerHTML=Object.entries(metrics).filter(([k])=>['answer_exact','provenance_completeness','stale_or_contradictory_error'].includes(k)).map(([k,v])=>'<div class="stat"><span>'+esc(k)+'</span><strong>'+v.numerator+'/'+v.denominator+'</strong><small>Исходная оценка кода; ограничения — ниже</small></div>').join('');
el('case-map').innerHTML=(DATA.result.review?.findings||[]).map(t=>'<p class="overview">'+esc(t)+'</p>').join('');el('case-map').style.display='block';el('categories').innerHTML='';
el('provenance').innerHTML=Object.entries({model:DATA.result.model,source_commit:DATA.result.source_commit,aggregate_sha256:DATA.result.aggregate_sha256,evidence_boundary:DATA.result.evidence_boundary}).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('');
el('stats-nav').onclick=()=>openView('stats');el('cases-nav').onclick=()=>openView('cases');document.querySelector('.brand').onclick=()=>openView('cases');
el('case-search').oninput=list;el('only-errors').onchange=list;
document.addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(b){selected=Number(b.dataset.case);render();openView('cases');}});
render();openView('cases');
