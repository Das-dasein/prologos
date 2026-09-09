const confidenceLabels={confirmed:'Дефект подтверждён',likely:'Вероятная причина',unresolved:'Причина не установлена'};
const categoryDescriptions={
 source_semantics:['Смысл «или» в датасете','Английский текст допускает обычное «или» или неоднозначен, а формула источника задаёт исключающее «или».'],
 mixed_source_contract:['Несколько проблем одновременно','Трактовка «или» в источнике сочетается с разрывом названий или неявной областью правил.'],
 translation:['Перенос фактов и названий','В одной задаче потерян факт. В обеих одни и те же понятия по соглашению датасета получили разные названия.'],
 domain_contract:['Неявная область правил','Источник предполагает, что персонаж — робот. В показанных условиях это явно не утверждается.'],
 query_mismatch:['Имена в запросе и программе','Запрос использует имя, которого нет в правилах. Внутри программы обнаружены и другие разрывы.'],
 invalid_program:['Невалидная формула','Исполнитель отклонил список на месте формулы. После исправления формата остаются другие проблемы.']
};
function probeDetail(p){
 const status=s=>statuses[s]||s;
 return `<details><summary>Отдельная диагностическая проверка</summary><p>${esc(p.change)}</p><p><b>До:</b> ${esc(status(p.status_before))}.<br><b>После:</b> ${esc(status(p.status_after))}.</p><p class="text-note">Это результат изменённой программы, а не новый ответ Луны. Оценка остаётся 17/30.</p><details><summary>Все варианты, контрпримеры и пути к записям</summary><pre>${esc(JSON.stringify(p,null,2))}</pre></details></details>`;
}
function analysisDetail(r){
 const a=r.analysis;if(!a)return '';
 const quoted=(items,code=false)=>(items||[]).map(text=>code?`<pre>${esc(text)}</pre>`:`<blockquote>${esc(text)}</blockquote>`).join('');
 return `<div class="analysis-detail"><span class="confidence ${esc(a.confidence)}">${confidenceLabels[a.confidence]||esc(a.confidence)}</span><h3 class="finding-title">${esc(a.title)}</h3><p class="small">${esc(a.category_label)} · разбор после эксперимента</p><details><summary>На чём основан вывод</summary><div class="evidence-pair"><div><h4>В исходных условиях</h4>${quoted(a.source_evidence)}</div><div><h4>В программе или запросе Луны</h4>${quoted(a.program_evidence,true)}</div></div><h4>Формулы из самого датасета</h4><p class="text-note">Эти поля изучены после эксперимента. Луна их не получала.</p>${quoted(a.source_formula_evidence,true)}<p><b>Что показал исполнитель:</b> ${esc(a.executor_evidence)}</p></details>${a.probe?probeDetail(a.probe):''}<p class="next-step"><b>Что проверять дальше:</b> ${esc(a.next_step)}</p></div>`;
}
function renderErrorAudit(){
 const audit=D.error_analysis;if(!audit)return;
 document.getElementById('errors').hidden=false;
 const groups=new Map();for(const a of audit.cases){if(!groups.has(a.category)){const [label,description]=categoryDescriptions[a.category]||[a.category_label,a.title];groups.set(a.category,{label,description,cases:[]});}groups.get(a.category).cases.push(a);}
 const counts={confirmed:0,likely:0,unresolved:0};for(const a of audit.cases)counts[a.confidence]++;
 document.getElementById('audit-summary').textContent=`В ${audit.summary.source_or_xor_disagreement_ids.length} из ${audit.cases.length} случаев различается трактовка «или» в тексте и формуле датасета. В ${counts.confirmed} задачах напрямую подтверждены дефекты программы. Проблемы пересекаются; ниже задачи сгруппированы по основной находке.`;
 document.getElementById('error-groups').innerHTML=[...groups.values()].sort((a,b)=>b.cases.length-a.cases.length).map(g=>`<div class="error-group"><h3><span>${esc(g.label)}</span><strong>${g.cases.length}</strong></h3><p>${esc(g.description)}</p><div class="error-ids">${g.cases.map(a=>`<button data-audit-case="${a.id}" aria-label="Разбор задачи ${a.id}: ${esc(a.title)}">№ ${a.id} ↗</button>`).join('')}</div></div>`).join('');
 document.getElementById('analysis-limits').innerHTML=(audit.limitations||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 document.getElementById('error-groups').addEventListener('click',e=>{const b=e.target.closest('[data-audit-case]');if(!b)return;search='';document.getElementById('search').value='';filter='missed';document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.filter===filter)));selectCase(Number(b.dataset.auditCase),true);});
}
