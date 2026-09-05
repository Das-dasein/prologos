"use strict";
const DATA = JSON.parse(document.getElementById('dashboard-data').textContent);
const cases = DATA.cases;
const el = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => value.toLocaleString('ru-RU', {maximumFractionDigits:1});
const status = c => typeof c.result?.answer_match !== 'boolean' ? 'na' : c.result.answer_match ? 'pass' : 'fail';
const labels = {pass:'✓ Совпало',fail:'× Расхождение',na:'— Нет данных'};
const categoryNames = {'stable recall':'Устойчивые факты','explicit correction/supersession':'Исправление фактов','temporal change without contradiction':'Изменения во времени','direct positive/negative conflict':'Прямые противоречия','non-memory content':'Не для запоминания','alias/coreference ambiguity':'Неоднозначные ссылки'};
let selected = 0;
function openView(name) {
  for (const view of ['stats','cases']) {el(view+'-view').hidden=view!==name;el(view+'-nav').setAttribute('aria-pressed',String(view===name));}
}
el('stats-nav').onclick=()=>openView('stats');el('cases-nav').onclick=()=>openView('cases');
document.querySelector('.brand').onclick=()=>openView('stats');
const measured=cases.filter(c=>status(c)!=='na'), passed=cases.filter(c=>status(c)==='pass').length;
const usages=cases.flatMap(c=>c.result?.usage||[]).filter(u=>Number.isFinite(u.total_tokens));
el('run-info').textContent=[DATA.result.model,DATA.result.condition,cases.length+' кейсов',cases.reduce((n,c)=>n+c.dialogue.length,0)+' ходов'].filter(Boolean).join(' · ');
const ratio=measured.length?number(passed/measured.length*100)+'%':'—';
el('totals').innerHTML='<div class="stat"><span class="muted">Точность ответов</span><strong>'+ratio+'</strong><small>'+passed+' из '+measured.length+' оценённых кейсов</small></div><div class="stat"><span class="muted">Расхождения</span><strong>'+(measured.length-passed)+'</strong><small>Нет данных: '+(cases.length-measured.length)+'</small></div><div class="stat"><span class="muted">Токенов / вызов</span><strong>'+(usages.length?number(Math.round(usages.reduce((n,u)=>n+u.total_tokens,0)/usages.length)):'—')+'</strong><small>Среднее по '+usages.length+' вызовам</small></div>';
el('case-map').innerHTML=cases.map((c,i)=>'<button class="tile '+status(c)+'" data-case="'+i+'"><strong>'+esc(c.case_id)+'</strong><span>'+labels[status(c)]+'</span></button>').join('');
const groups=Object.groupBy?Object.groupBy(cases,c=>c.category):cases.reduce((g,c)=>((g[c.category]??=[]).push(c),g),{});
el('categories').innerHTML=Object.entries(groups).map(([name,items])=>{const n=items.filter(c=>status(c)!=='na').length,p=items.filter(c=>status(c)==='pass').length;return '<div class="category"><span>'+esc(categoryNames[name]||name)+'</span><span class="bar"><i style="width:'+(n?p/n*100:0)+'%"></i></span><b>'+(n?p+'/'+n+' · '+number(p/n*100)+'%':'—')+'</b></div>';}).join('');
el('provenance').innerHTML=[['Статус доказательств',DATA.result.evidence_boundary],['Промпт',DATA.result.provider_prompt_template||DATA.result.prompt_template],['SHA промпта',DATA.result.provider_prompt_sha256||DATA.result.prompt_sha256],['SHA датасета',DATA.result.dataset_sha256],['Commit в результате',DATA.result.source_commit],['Бюджет контекста',DATA.result.max_context_tokens??'Не записан в результате']].map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v??'Не записано')+'</dd>').join('');
function caseList(){const search=el('case-search').value.toLowerCase(),errors=el('only-errors').checked;el('case-list').innerHTML=cases.map((c,i)=>({c,i})).filter(({c})=>(!errors||status(c)==='fail')&&(c.case_id+' '+c.dialogue.map(t=>t.text).join(' ')).toLowerCase().includes(search)).map(({c,i})=>'<button data-case="'+i+'" aria-current="'+(i===selected)+'"><span>'+esc(c.case_id)+'</span><span>'+({pass:'✓',fail:'×',na:'—'}[status(c)])+'</span></button>').join('')||'<p class="empty">Ничего не найдено</p>';}
function answers(value){return Array.isArray(value)?(value.length?value.join('\n'):'∅ Пустой ответ'):'Нет данных';}
function renderCase(){const c=cases[selected];if(!c){el('case-detail').textContent='Нет кейсов';return;}const r=c.result;
el('case-detail').innerHTML='<div class="case-title"><h2>'+esc(c.case_id)+'</h2><span class="status '+status(c)+'">'+labels[status(c)]+'</span></div><p class="muted">'+esc(categoryNames[c.category]||c.category)+'</p><section class="comparison"><h3>Результат Prolog</h3><code>'+esc(r?.query||c.oracle?.query)+'</code><div class="answers"><div><p class="muted">Ожидаемый ответ</p><pre>'+esc(answers(r?.expected_query_answers||c.oracle?.query_answers))+'</pre></div><div><p class="muted">Полученный ответ</p><pre>'+esc(answers(r?.query_answers))+'</pre></div></div></section><h2>Диалог · '+c.dialogue.length+' хода</h2><p class="muted">На каждом ходе показан результат извлечения фактов моделью.</p>'+c.dialogue.map(t=>{const o=t.provider?.output,u=t.provider?.usage;return '<section class="turn"><header><span>Ход '+t.turn+' · '+esc(t.speaker)+'</span><span>'+(u?number(u.input_tokens)+' вх. / '+number(u.output_tokens)+' вых.':'Нет usage')+'</span></header><p class="user-text">'+esc(t.text)+'</p><div class="extracted"><p class="muted">Извлечённые факты</p>'+(o?Array.isArray(o.assertions)&&o.assertions.length?o.assertions.map(a=>'<pre>'+esc((a.polarity==='negative'?'¬ ':'')+a.relation+'('+a.arguments.join(', ')+')')+'</pre>').join(''):'<p class="empty">Нет утверждений</p>':'<p class="empty">Ответ модели не сохранён</p>')+'</div>'+(o?'<details><summary>Полный ответ модели · JSON</summary><pre>'+esc(JSON.stringify(o,null,2))+'</pre></details>':'')+'</section>';}).join('');caseList();}
document.addEventListener('click',event=>{const button=event.target.closest('[data-case]');if(button){selected=Number(button.dataset.case);renderCase();openView('cases');}});
el('case-search').oninput=caseList;el('only-errors').onchange=caseList;
renderCase();
