# Разбор 13 несовпадений с эталоном Luna30

Это **последующий аудит**, а не новый прогон модели и не независимая CDR-проверка. Исходный результат остаётся **M1 12/30, M2 17/30** совпадений с gold.

Главный вывод: называть все 13 случаев ошибками логики Луны нельзя. В восьми случаях английские формулировки «или» расходятся со скрытым XOR источника; в нескольких одновременно есть потеря факта, несовпадение имён или неявное членство в классе. Эти группы пересекаются. Прямые дефекты: пропуск отрицания в 155, имя запроса в 378 и невалидный Head в 404. Во всех трёх одного локального исправления недостаточно.

Проверен исходный SHA-256 датасета: `79428ef614d43729ce82e4d065055fdc6a39abad0f20cb226c5288fc315468e4`. Поля `nl2fol`, `reasoning` и `conclusion_fol` изучены только после эксперимента и сохранены в [source-excerpts.json](luna-thirty-error-probes/source-excerpts.json). Луне эти поля не передавались.

В 41 свежем процессе SWI-Prolog проверялись полные неизменяемые кандидаты; программы и запросы сохранены отдельно. Все 13 исходных статусов воспроизведены: 12 unknown, 1 invalid_program. Применялся prover `56edb3f` (после удаления предупреждений из примеров API). Контрфактические варианты не засчитаны как ответы M2. [Все пробы](luna-thirty-error-probes/results.json); [повторяемый запуск](run-luna-thirty-error-probes.py).

| Задача | Эталон | M1/M2 | Основная проблема | Уверенность |
|---|---|---|---|---|
| 25 | A | C/C | Текст и формула датасета расходятся | likely |
| 73 | B | C/C | Текст и формула датасета расходятся | likely |
| 105 | A | C/C | Смешались смысл «или» и область правил | likely |
| 128 | A | C/C | Текст и формула датасета расходятся | likely |
| 155 | A | C/C | Потеря факта и разрыв названий | confirmed |
| 198 | B | C/C | Разрыв названий понятий | likely |
| 263 | B | C/C | Текст и формула датасета расходятся | likely |
| 298 | A | C/C | Неявная область датасета | likely |
| 375 | B | C/C | Текст прямо противоречит формуле датасета | likely |
| 378 | B | C/C | Запрос и программа говорят разными именами | confirmed |
| 404 | A | C/C | Невалидная программа плюс другие разрывы | confirmed |
| 406 | A | C/C | Смешались названия и смысл «или» | likely |
| 419 | B | C/C | Текст и формула датасета расходятся | likely |

## 25: «Не обязательно оба» превратилось в «ровно одно»

Луна передала «not necessarily both» обычным «или»: оба варианта разрешены. Скрытая формула датасета использует XOR и запрещает оба. Поэтому из факта о новых дебютах эталон исключает анализ партий, затем выводит изучение соперников, победы и отсутствие статуса легенды. В показанном Луне тексте запрета на одновременность нет. Результат unknown согласуется с буквальным чтением. В объяснениях моделей также есть ошибки: M1 отрицает вывод частой практики, хотя он есть; M2 заявляет вывод побед, которого программа не гарантирует.

Исходный текст и скрытая формула:

- For Ramon, he either develops new openings or analyzes games, but not necessarily both. → source nl2fol: develops_new_openings(Ramon) ⊕ analyzes_games(Ramon)
- Ramon analyzes games or studies opponents. → source nl2fol: analyzes_games(Ramon) ∨ studies_opponents(Ramon)

Что есть в программе:

- `s10: or(develops_new_openings(ramon), analyzes_games(ramon))`
- `s6: strategic_mind(ramon) → xor(wins_major_tournaments(ramon), becomes_legend_in_chess(ramon))`

Замороженный статус unknown; повтор неизменённой программы дал unknown и два мира для not(becomes_legend_in_chess(ramon)). Замена только s10 на XOR, как в source nl2fol, дала entailed.

Проверка: Только s10: OR → XOR согласно скрытой формуле источника; это изменение смысла показанного текста, а не бесспорное исправление.

Варианты: baseline → unknown, source-xor → entailed.

[Полный кандидат](luna-thirty-error-probes/case-25-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-25-source-xor-stdout.txt)

Далее: Развести в следующем протоколе оценку по буквальному английскому тексту и по скрытой формуле источника; не учить модель читать любое «или» как XOR.

## 73: Эталон требует запрета, которого текст явно не задаёт

Из защиты меньшинств и отсутствия поддержки свободы следует поддержка прав человека. Дальше эталон запрещает одновременно поддерживать права человека и продвигать социальную справедливость. Но текст говорит «no one necessarily does both», а не «никто не делает оба». Луна использовала обычное «или», source nl2fol — XOR. При буквальном чтении отрицание экстремизма не определяется. В исходном reasoning есть дополнительная ошибка знака: предпоследний вывод напечатан как «opposes extremism», хотя финальный ответ B и формула требуют отрицания.

Исходный текст и скрытая формула:

- Lovie either supports human rights or promotes social justice, but no one necessarily does both. → source nl2fol: supports_human_rights(Lovie) ⊕ promotes_social_justice(Lovie)
- For all humans, if they oppose extremism or value tolerance, then they promote social justice. → source nl2fol: ∀x ((opposes_extremism(x) ∨ values_tolerance(x)) → promotes_social_justice(x))

Что есть в программе:

- `s8: or(supports_human_rights(lovie), promotes_social_justice(lovie))`
- `s4: (opposes_extremism ∨ values_tolerance) → promotes_social_justice`

unknown воспроизведён. Только s8 OR → XOR даёт contradicted для положительного opposes_extremism(lovie), то есть B.

Проверка: Только s8: OR → XOR согласно source nl2fol.

Варианты: baseline → unknown, source-xor → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-73-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-73-source-xor-stdout.txt)

Далее: Проверить формулировку дизъюнкции и знак в source reasoning; сохранить C как фактический ответ модели и B как неизменённый gold.

## 105: Для вывода не хватает двух разных соглашений

Модель добавила farmer(X) в условия общих правил, но не установила farmer(ronan). В source nl2fol «фермеры» являются неявной областью всех объектов и отдельного условия farmer нет. Кроме того, «not necessarily both» модель передала через OR, а источник — через XOR. Только вместе эти различия разрывают путь к опытности Ронана и отрицанию новых методов. Нельзя честно свести промах к одному пропущенному факту или назвать добавление farmer однозначно неверным при буквальном чтении.

Исходный текст и скрытая формула:

- Every dedicated farmer either improves their crops or is experienced (or both). → source nl2fol: ∀x (dedicated(x) → (improve_crops(x) ∨ experienced(x)))
- For all farmers, either they diversify their farm or improve their crops, but not necessarily both. → source nl2fol: ∀x (diversify_farm(x) ⊕ improve_crops(x))

Что есть в программе:

- `s3: farmer(X) ∧ dedicated(X) → (improves_crops(X) ∨ experienced(X))`
- `s4: farmer(X) → or(diversifies_farm(X), improves_crops(X))`
- `Нет факта farmer(ronan).`

Baseline unknown. Только farmer(ronan) → unknown; только XOR в s4 → unknown; оба изменения → entailed для отрицательного запроса.

Проверка: Добавлены farmer(ronan) и XOR в s4; обе гипотезы опираются на scorer-only source nl2fol.

Варианты: baseline → unknown, type-only → unknown, source-xor-only → unknown, type-and-source-xor → entailed.

[Полный кандидат](luna-thirty-error-probes/case-105-type-and-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-105-type-and-source-xor-stdout.txt)

Далее: Явно определить, являются ли все персонажи фермерами по контракту датасета, и отдельно решить неоднозначность OR/XOR до нового прогона.

## 128: Два скрытых XOR меняют весь вывод

Две фразы с обычным «either … or» источник кодирует как XOR: связь timid/takes risks и связь adventurous/loves nature. Луна использует OR в обоих местах. В исходном английском нет «but not both» для этих двух фраз, хотя в других правилах такой запрет написан явно. Поэтому вывод о небесстрашии зависит от скрытой семантики источника. Дополнительный нюанс: «mutually exclusive» Луна тоже кодирует XOR, хотя буквально это лишь запрет обоих; для Nathalia известная humility делает это различие несущественным в данной цепочке.

Исходный текст и скрытая формула:

- If Nathalia is either timid or takes risks, then she is adventurous. → source nl2fol: (takes_risks(Nathalia) ⊕ timid(Nathalia)) → adventurous(Nathalia)
- If someone is an explorer, then they are either adventurous or love nature. → source nl2fol: ∀x (is_explorer(x) → (adventurous(x) ⊕ loves_nature(x)))

Что есть в программе:

- `s9: (timid(nathalia) ∨ takes_risks(nathalia)) → adventurous(nathalia)`
- `s20: explorer(X) → (adventurous(X) ∨ loves_nature(X))`

Baseline unknown. XOR только в s9 оставляет unknown. XOR только в s20 создаёт conflict. Два XOR, как в source nl2fol, дают entailed для not(fearless(nathalia)).

Проверка: s9 и s20: OR → XOR согласно скрытым формулам; частичные замены проверены отдельно.

Варианты: baseline → unknown, source-xor-s9 → unknown, source-xor-s20 → conflict, source-two-xors → entailed.

[Полный кандидат](luna-thirty-error-probes/case-128-source-two-xors.pl) · [Вывод Prolog](luna-thirty-error-probes/case-128-source-two-xors-stdout.txt)

Далее: Не менять дизъюнкции по одной ради совпадения с gold: сначала согласовать смысл полного исходного набора правил.

## 155: Луна пропустила важное отрицание

В исходнике есть «Elina does not perform well», но этой аксиомы в программе нет. Именно она нужна для вывода отсутствия успеха, затем целей, затем преодоления страха. Дополнительно «can overcome fear» и «overcomes fear» получили разные имена. Удалён также XOR про Bridget, но он не относится к вопросу об Elina. Пропуск факта подтверждён напрямую. Сведение can/overcomes в один предикат соответствует скрытой формуле датасета, но это всё ещё семантическое соглашение, а не общий закон о способности и действии.

Исходный текст и скрытая формула:

- Elina does not perform well. → source nl2fol: ¬performs_well(Elina)
- If Elina masters extreme sports, then she can overcome fear. → source nl2fol: master_extreme_sports(Elina) → overcome_fear(Elina)
- If Elina is a professional athlete, then she either overcomes fear or stays disciplined, but not both. → source nl2fol: professional_athlete(Elina) → (overcome_fear(Elina) ⊕ stay_disciplined(Elina))

Что есть в программе:

- `Есть not(performs_well(bridget)), но нет not(performs_well(elina)).`
- `s15: masters_extreme_sports(elina) → can_overcome_fear(elina)`
- `s17 использует overcomes_fear(elina), другой предикат.`

Baseline unknown. Восстановить только отрицание → unknown. Исправить только имя → unknown. Восстановить отрицание и свести имена → entailed для not(masters_extreme_sports(elina)).

Проверка: Добавлен пропущенный not(performs_well(elina)); can_overcome_fear сведён к overcomes_fear.

Варианты: baseline → unknown, normalize-fear → unknown, restore-negative → unknown, normalize-and-restore → entailed.

[Полный кандидат](luna-thirty-error-probes/case-155-normalize-and-restore.pl) · [Вывод Prolog](luna-thirty-error-probes/case-155-normalize-and-restore-stdout.txt)

Далее: Добавить отдельный контроль полноты переноса всех исходных утверждений и словарь одинаковых понятий; тестировать на новой выборке, без ремонта текущих результатов.

## 198: Одна цепочка раскололась на четыре названия

Программа различает has_training и has_proper_training, а также responds_to_emergencies и responds_to_emergencies_effectively. Source nl2fol использует по одному предикату на каждую пару. Поэтому нельзя связать отсутствие реакции на чрезвычайные ситуации с приоритетом безопасности и храбростью. Оба разрыва нужно устранить одновременно. При буквальном чтении «прошёл обучение» и «имеет подходящую подготовку» не всегда равнозначны: это расхождение с условным языком датасета, а не доказательство произвольной ошибки мира.

Исходный текст и скрытая формула:

- Gary gains experience or has training. → source nl2fol: gains_experience(Gary) ∨ has_training(Gary)
- Anyone who prioritizes their own safety and has proper training can respond to emergencies effectively. → source nl2fol: ∀x ((prioritize_self_safety(x) ∧ has_training(x)) → responds_to_emergencies(x))
- Anyone who responds to emergencies either stays calm under pressure or leads others effectively (or both). → source nl2fol: ∀x (responds_to_emergencies(x) → (stays_calm_under_pressure(x) ∨ leads_others_effectively(x)))

Что есть в программе:

- `s5 использует has_training(gary), s9 требует has_proper_training(X).`
- `s9 заключает responds_to_emergencies_effectively(X), s10 требует responds_to_emergencies(X).`

Baseline unknown. Каждая нормализация отдельно оставляет unknown; обе вместе дают contradicted для not(earns_accolades(gary)), то есть B. В source reasoning последний шаг ошибочно содержит not, несмотря на положительное следствие и ответ B.

Проверка: Сведены has_proper_training/has_training и responds_to_emergencies_effectively/responds_to_emergencies.

Варианты: baseline → unknown, normalize-training → unknown, normalize-response → unknown, normalize-both → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-198-normalize-both.pl) · [Вывод Prolog](luna-thirty-error-probes/case-198-normalize-both-stdout.txt)

Далее: Зафиксировать допустимое отождествление словесных вариантов до формализации; отдельно проверять знак отрицательного вопроса.

## 263: Адаптация не означает отсутствие выживания

Источник из способности адаптироваться выводит отсутствие выживания, потому что скрытая формула содержит XOR. В английской фразе про адаптацию или выживание запрет одновременности не указан. Луна передала OR. При таком чтении Queenie может и адаптироваться, и выживать, поэтому дальнейшее исключение быстрого размножения не обязательно. Тип parasite(queenie) здесь установлен явно; объяснять этот промах отсутствием типа было бы ошибкой.

Исходный текст и скрытая формула:

- All parasites are either able to adapt to their host or survive in its environment, if they reproduce successfully. → source nl2fol: ∀x (reproduce_successfully(x) → (adapt_to_host(x) ⊕ survive_environment(x)))
- Queenie is able to adapt to her host. → source nl2fol: adapt_to_host(Queenie)

Что есть в программе:

- `s10: (parasite(X) ∧ reproduces_successfully(X)) → or(adapts_to_host(X), survives_in_environment(X))`
- `s15 содержит parasite(queenie).`

Baseline unknown с двумя мирами. Замена только s10 на XOR даёт contradicted для multiplies_rapidly(queenie), то есть B.

Проверка: Только s10: OR → XOR согласно source nl2fol.

Варианты: baseline → unknown, source-xor → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-263-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-263-source-xor-stdout.txt)

Далее: Уточнить в тексте «но не оба», если нужен смысл скрытой формулы; иначе не считать буквальное OR доказанной ошибкой модели.

## 298: Правила про роботов не знают, что Muppet — робот

Модель поставила robot(X) в условия правил, но не добавила robot(muppet). Объявление domain(person,[muppet]) задаёт набор объектов решателя и само по себе не доказывает ни person(muppet), ни robot(muppet). Скрытые формулы датасета вообще не используют robot: все переменные уже предполагаются роботами. Поэтому literal typed reading и контракт генератора расходятся. Модель не могла увидеть скрытую формулу; добавлять тип автоматически без оговорённого контракта нельзя.

Исходный текст и скрытая формула:

- Any robot that can process information is able to analyze data. → source nl2fol: ∀x (process_information(x) → analyze_data(x))
- For all robots, if a robot has advanced sensors and has deep learning capabilities, then it can make informed decisions. → source nl2fol: ∀x ((has_advanced_sensors(x) ∧ has_deep_learning_capabilities(x)) → can_make_informed_decisions(x))

Что есть в программе:

- `domain(person,[muppet]).`
- `s5 требует robot(X), s9 тоже требует robot(X).`
- `Нет факта robot(muppet).`

Baseline unknown. В отдельном полном кандидате единственное добавление robot(muppet) даёт entailed для can_make_informed_decisions(muppet).

Проверка: Добавлен robot(muppet), который неявно предполагается source nl2fol, но не утверждается отдельной фразой.

Варианты: baseline → unknown, type-robot → entailed.

[Полный кандидат](luna-thirty-error-probes/case-298-type-robot.pl) · [Вывод Prolog](luna-thirty-error-probes/case-298-type-robot-stdout.txt)

Далее: Прописать в протоколе, что все объекты задачи принадлежат подразумеваемому классу, либо требовать явное членство в исходном тексте.

## 375: «Не взаимоисключающие» записано как XOR

Это самый ясный конфликт источника: английский текст прямо разрешает сочетание городской жизни и любви к природе («not mutually exclusive»), а скрытая формула ставит XOR. Source reasoning затем неправомерно выводит отсутствие любви к природе из любви к городской жизни. При буквальном тексте допустим мир: Norah любит и город, и природу, но не ценит знания. Он делает отрицательный вопрос истинным, тогда как gold B требует его ложности. Допустим и мир с ценностью знаний. Поэтому C здесь нельзя безоговорочно называть логической ошибкой Луны.

Исходный текст и скрытая формула:

- Everyone either enjoys city life or appreciates nature, but they are not mutually exclusive. → source nl2fol: ∀x (enjoy_city_life(x) ⊕ appreciate_nature(x))
- Norah either appreciates nature or values knowledge (or both). → source nl2fol: appreciate_nature(Norah) ∨ value_knowledge(Norah)

Что есть в программе:

- `s10: forall(var(x,person), or(enjoys_city_life(var(x)), appreciates_nature(var(x))))`
- `s11: or(appreciates_nature(norah), values_knowledge(norah))`

Baseline unknown и два сохранённых мира для not(values_knowledge(norah)). Только подмена s10 OR на XOR даёт contradicted, совпадая с gold B.

Проверка: Только s10: OR → XOR. Это противоречит буквальному not mutually exclusive, но воспроизводит source nl2fol.

Варианты: baseline → unknown, source-xor → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-375-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-375-source-xor-stdout.txt)

Далее: Пометить конфликт NL/FOL в данных и независимо рассмотреть исправление текста или gold. Сохранить исходный результат для воспроизводимости.

## 378: Запрос спрашивает о несуществующем предикате

В программе есть receive_accolades, а запрос содержит receives_accolades. Для Prolog это два разных свойства: никакие правила не ограничивают предикат запроса. M1 сам это заметил; signature_audit пометил only_in_goal. Но одной опечаткой проблема не исчерпывается: develop/develops, improve/improves и разные advance_field тоже разбивают цепь, а scientist(clark) не установлен. Source nl2fol объединяет эти названия и предполагает научную область. Поэтому «исправить одну букву — и задача решена» было бы неверно.

Исходный текст и скрытая формула:

- For all scientists, if a scientist is renowned, then they either make breakthrough discoveries or receive accolades (or both). → source nl2fol: ∀x (renowned(x) → (make_breakthrough_discoveries(x) ∨ receive_accolades(x)))
- Every scientist who dedicates their career to research either improves existing processes or creates new materials. → source nl2fol: ∀x (dedicate_career_to_research(x) → (improve_existing_processes(x) ∨ create_new_materials(x)))
- If Dr. Clark either develops new techniques or makes breakthrough discoveries (but not both), then he will advance his field. → source nl2fol: (develop_new_techniques(Clark) ⊕ make_breakthrough_discoveries(Clark)) → advance_the_field(Clark)

Что есть в программе:

- `Программа: receive_accolades(var(x)); запрос: not(receives_accolades(clark)).`
- `develop_new_techniques и develops_new_techniques; improve_existing_processes и improves_existing_processes.`
- `advance_field, advances_his_field и advances_their_field; отсутствует scientist(clark).`

only_in_goal([receives_accolades/1]); baseline unknown. Только исправить запрос → unknown. Нормализовать также имена → unknown. Вместе с scientist(clark) → contradicted для отрицательного вопроса, то есть B.

Проверка: Исправлен запрос, сведены четыре группы имён и явно добавлен scientist(clark) по соглашению источника.

Варианты: baseline → unknown, query-only → unknown, normalize-names → unknown, normalize-and-type → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-378-normalize-and-type.pl) · [Вывод Prolog](luna-thirty-error-probes/case-378-normalize-and-type-stdout.txt)

Далее: Проверять словарь запроса до запуска; отдельно проверять согласованность имён внутри правил и контракт области. Не выдавать совпадение после нескольких замен за измеренную точность модели.

## 404: Список оказался там, где нужна формула

В первом правиле результат записан как [or(...)], то есть список из одной формулы. Контракт rule(Body,Head) требует формулу в Head: список допустим только в Body. Исполнитель правильно отклонил программу. Это не предупреждение про singleton variables. После удаления лишних скобок задача всё ещё не решается: human(julian) отсутствует, а keeps_things_tidy и organized различаются, хотя скрытая формула их объединяет. Ответ M2 C на invalid_program нельзя считать логическим доказательством неопределённости.

Исходный текст и скрытая формула:

- If Julian has hidden talents, then he is either organized or creates new opportunities (or both). → source nl2fol: has_hidden_talents(Julian) → (organized(Julian) ∨ creates_new_opportunities(Julian))
- All humans with curiosity value knowledge and respect history. → source nl2fol: ∀x (has_curiosity(x) → (values_knowledge(x) ∧ respects_history(x)))
- If someone keeps things tidy and finds the resources they need, then they can achieve success. → source nl2fol: ∀x ((organized(x) ∧ finds_resources(x)) → achieves_success(x))

Что есть в программе:

- `s1: rule([hidden_talents(julian)],[or(organized(julian),creates_new_opportunities(julian))])`
- `s8 требует human(X), но human(julian) не установлен.`
- `s11: keeps_things_tidy(X), последний XOR использует organized(julian).`

Замороженный и повторный статус invalid_program: non_atomic_argument(or(...)). Только исправить Head → unknown; плюс только тип или только имя → unknown; Head+тип+имя → entailed.

Проверка: Убраны скобки списка из Head, keeps_things_tidy сведён к organized, добавлен human(julian).

Варианты: baseline → invalid_program, valid-head-only → unknown, head-and-type → unknown, head-and-name → unknown, head-name-type → entailed.

[Полный кандидат](luna-thirty-error-probes/case-404-head-name-type.pl) · [Вывод Prolog](luna-thirty-error-probes/case-404-head-name-type-stdout.txt)

Далее: Валидировать форму программы отдельным техническим шлюзом и отличать «программа не принята» от ответа C. Семантические изменения проверять отдельно от синтаксиса.

## 406: Исправить имя недостаточно: остаётся спорное «или»

Модель выводит embrace_uncertainty, но другое правило требует embraces_uncertainty. Это разрыв имён относительно source nl2fol. Однако даже после их объединения из «любит приключения или занимается творчеством» нельзя выбрать первое. Source nl2fol дополнительно трактует «do not necessarily overlap» как XOR, хотя текст не запрещает пересечение. Только сочетание нормализации и этого усиления даёт gold. M2 ошибочно утверждает, что исходная программа уже выводит free_spirited: сохранённый контрмир это опровергает.

Исходный текст и скрытая формула:

- Anyone who is spontaneous and trusts their intuition can learn to embrace uncertainty. → source nl2fol: ∀x ((is_spontaneous(x) ∧ trusts_intuition(x)) → embraces_uncertainty(x))
- Anyone who values independence and embraces uncertainty is free-spirited. → source nl2fol: ∀x ((values_independence(x) ∧ embraces_uncertainty(x)) → free_spirited(x))
- Alana either pursues creative passions or appreciates simple things, but these two traits do not necessarily overlap in her life. → source nl2fol: appreciates_simple_things(Alana) ⊕ pursue_creative_passions(Alana)

Что есть в программе:

- `s2 и s11 выводят embrace_uncertainty(X), s5 требует embraces_uncertainty(X).`
- `s14: or(pursues_creative_passions(alana), appreciates_simple_things(alana)).`

Baseline unknown. Только имя → unknown; только XOR s14 → unknown; оба изменения → entailed для loves_adventure(alana).

Проверка: embrace_uncertainty → embraces_uncertainty и s14 OR → XOR согласно source nl2fol.

Варианты: baseline → unknown, normalize-name → unknown, source-xor-only → unknown, normalize-and-source-xor → entailed.

[Полный кандидат](luna-thirty-error-probes/case-406-normalize-and-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-406-normalize-and-source-xor-stdout.txt)

Далее: Отдельно устранить разрыв имён и пометить неоднозначность текста. Не объяснять ошибку одной буквой.

## 419: Эталон исключает культурную традицию без явного запрета

Из «embraces diversity» источник выводит «не чтит культуру», потому что его скрытая формула связывает эти свойства через XOR. Но в английском сказано «not necessarily both», а не «not both». Луна разрешила совместность через OR. Тогда можно чтить культуру, не соблюдать традиции и не ценить уникальность; цепь к крафтовому пиву не обязательна, а выбор массового пива остаётся открытым. По буквальному тексту наблюдаемый C обоснован.

Исходный текст и скрытая формула:

- For Kahlani, she either honors her culture or embraces diversity, but not necessarily both. → source nl2fol: embraces_diversity(Kahlani) ⊕ honors_culture(Kahlani)
- Kahlani honors culture or respects tradition. → source nl2fol: honors_culture(Kahlani) ∨ respects_tradition(Kahlani)

Что есть в программе:

- `s14: or(honors_culture(kahlani), embraces_diversity(kahlani))`
- `s16: or(honors_culture(kahlani), respects_tradition(kahlani))`

Baseline unknown с двумя мирами. Замена только s14 на XOR даёт contradicted для prefers_mass_produced_beer(kahlani), то есть B.

Проверка: Только s14: OR → XOR по скрытой формуле источника.

Варианты: baseline → unknown, source-xor → contradicted.

[Полный кандидат](luna-thirty-error-probes/case-419-source-xor.pl) · [Вывод Prolog](luna-thirty-error-probes/case-419-source-xor-stdout.txt)

Далее: Уточнить дизъюнкцию в источнике; не оптимизировать формализацию под скрытый gold за счёт изменения смысла.

## Ограничения

- Это анализ после завершения опыта, с доступом к gold, reasoning и скрытым формулам. Он не является слепой оценкой и не заменяет независимую CDR-проверку.
- 41 отдельный offline-запуск SWI-Prolog проверяет заданные программы. Новых вызовов Луны не было; результат остаётся M1 12/30, M2 17/30 совпадений с исходным эталоном.
- Контрфактические кандидаты специально используют найденные различия. Совпадение их статуса с gold не доказывает единственную причину промаха, семантическую верность всех правок или новую точность модели.
- Сохранённые true/false worlds подтверждают неопределённость для формализованной программы. Перенос этого вывода на английский текст требует отдельной проверки семантической эквивалентности.
- В 8 задачах видимый английский OR расходится со скрытым XOR. Это не 8 автоматически аннулированных задач и не основание пересчитать оценку без отдельного решения о контракте.
- Повтор использует текущий prover 56edb3f после удаления singleton warnings; все 13 исходных статусов воспроизведены. Это не A/B-проверка влияния шума на модель.
- confirmed означает непосредственно наблюдаемый дефект, а не доказанную достаточность единственного исправления. likely отмечает зависимость причинного объяснения от семантических соглашений.
