# Источники и маршрут чтения

[Оглавление](00-index.md)

Проверено 10 сентября 2026 года. Уроки — самостоятельные объяснения с авторскими примерами и задачами. Это не перевод и не конспект одной книги. Сначала проходи урок, затем читай соответствующий раздел первоисточника: так незнакомые обозначения будут мешать меньше.

## База: уроки 1–6

[**forall x: Calgary**](https://forallx.openlogicproject.org/html/) — P. D. Magnus, Tim Button, Robert Trueman, Richard Zach, с указанными в книге соавторами и участниками. Открытый авторский учебник. Просмотренная HTML-версия: Fall 2025, revision e1bbdcd, дата сборки 2026-09-07. Онлайн-книга обновляется, поэтому названия глав надёжнее, чем номера страниц.

- Arguments; The scope of logic — аргументы и границы дедукции.
- [Connectives](https://forallx.openlogicproject.org/html/Ch5.html) — связки и перевод условий.
- [Semantic concepts](https://forallx.openlogicproject.org/html/Ch12.html) — выполнимость и следование.
- [Soundness and completeness](https://forallx.openlogicproject.org/html/Ch22.html) — различие моделей и доказательств.
- [Multiple generality](https://forallx.openlogicproject.org/html/Ch25.html) — порядок кванторов.
- [Basic rules for FOL](https://forallx.openlogicproject.org/html/Ch36.html) — ограничения при работе со свидетелями.

Лицензия самого учебника: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Наши задачи и примеры не заимствованы из набора его упражнений.

## Исполняемая логика: уроки 6–7

- Peter Flach, [**Simply Logical, §3.1: SLD-resolution**](https://book.simply-logical.space/src/text/1_part_i/3.1.html) — как программа строит дерево поиска.
- Peter Flach, [**§3.3: Negation as failure**](https://book.simply-logical.space/src/text/1_part_i/3.3.html) — почему неуспех и отрицание нельзя отождествлять без условий.
- [Документация SWI-Prolog: `\+/1`](https://www.swi-prolog.org/pldoc/man?predicate=%5C%2B%2F1) — нормативное описание оператора, включая конечное время неуспеха.
- [Документация SWI-Prolog: `unify_with_occurs_check/2`](https://www.swi-prolog.org/pldoc/man?predicate=unify_with_occurs_check%2F2) — различие конечных и циклических термов.

## Исследовательские направления: уроки 8–12

### Умолчания

Raymond Reiter, [**A Logic for Default Reasoning**](https://www.horty.umiacs.io/courses/readings/reiter-default-1980.pdf), Artificial Intelligence 13 (1980), 81–132. Читать после урока 8: сначала мотивацию и смысл default, затем определения расширений. Наша словесная учебная политика не объявляется полной реализацией системы Рейтера.

### Параконсистентность

[**Making Belnap’s “Useful Four-Valued Logic” Useful**](https://cdn.aaai.org/ocs/17599/17599-77711-1-PB.pdf) — исследовательская статья с изложением четырёхзначной структуры и вопроса об импликации. Для начала достаточно сопоставить её значения и выделенность с нашим расчётом в уроке 9. Разделы о предлагаемых расширениях — следующий уровень, в курсе их реализация не заявляется.

### Аргументация

Phan Minh Dung, [**On the acceptability of arguments and its fundamental role in nonmonotonic reasoning, logic programming and n-person games**](https://cse-robotics.engr.tamu.edu/dshell/cs631/papers/dung95acceptability.pdf), Artificial Intelligence 77 (1995), 321–357. После урока 10 найди определения защиты, допустимости и grounded-extension. Внутренняя структура аргумента и истинность его источников не извлекаются из абстрактного графа автоматически.

### Пересмотр убеждений

Carlos E. Alchourrón, Peter Gärdenfors, David Makinson, [**On the Logic of Theory Change: Partial Meet Contraction and Revision Functions**](https://fitelson.org/piksi/piksi_22/agm.pdf), The Journal of Symbolic Logic 50(2), 1985, 510–530. После урока 11 сначала прочитай постановку и постулаты. Доказательства теорем представления не обязательны для первого прохождения.

### Эпистемическая логика

Hans van Ditmarsch, Joseph Y. Halpern, Wiebe van der Hoek, Barteld Kooi, [**An Introduction to Logics of Knowledge and Belief**](https://www.cs.cornell.edu/info/people/halpern/papers/handbook-intro.pdf), глава 1 Handbook of Epistemic Logic, 2015. После урока 12 начни с возможных миров, доступности и различия знания и убеждения.

## Справочные обзоры

Эти авторские энциклопедические обзоры полезны как карта терминов и библиография. Оригинальные формальные подходы выше нужно читать отдельно.

- [Paraconsistent Logic](https://plato.stanford.edu/entries/logic-paraconsistent/)
- [Non-monotonic Logic](https://plato.stanford.edu/entries/logic-nonmonotonic/)
- [Logic of Belief Revision](https://plato.stanford.edu/entries/logic-belief-revision/)
- [Epistemic Logic](https://plato.stanford.edu/entries/logic-epistemic/)

## Привязка к проекту

Описание raw/safe в уроках 9 и 12 сверено с `world/checker.pl`, `world/checker.js` и контрактом `.cdd/waves/agent-world-poc-v0/contract.md` в текущем проекте. Оно относится именно к этой версии политики. Перенос папки курса в другое хранилище не требует этих файлов: необходимое определение и исходные примеры полностью приведены в уроках.

Автоматическая проверка примеров подтверждает указанные конечные вычисления; она не удостоверяет научную новизну проекта или правильность любой возможной интерпретации естественного языка.
