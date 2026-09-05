# γ dispatch: offline evaluator v3

Дата: 2026-09-05. Роль: γ CDR/CDD coordination. Состояние: READY FOR δ ROUTING.
Это dispatch-пакет, а не verdict и не receipt. Live model calls запрещены.

## Selection decision

Выбранный gap: текущий evaluator смешивает содержательную ошибку модели с форматной ошибкой, несовместимыми идентификаторами и потерянной provenance; stale/contradictory check также пропускает старое утверждение после явной замены.

Основание выбора: project wave manifest требует отделять symbolic, extraction и end-to-end causes; `.cdr/POLICY.md` требует доказательную границу, исходные outputs, воспроизводимость и явное различение observed/computed/inferred/hypothesized/indeterminate. Это gap с наибольшим влиянием на интерпретацию уже сохранённых и будущих результатов.

Зависимость: существующий B4-файл историчен, post-hoc и non-transmissible. Новый evaluator может только переоценить frozen outputs; он не превращает их в новый live run. Будущий runtime repair (supersede, answer-v3 envelope, relation/query reconciliation) — отдельный MCA.

## Falsifiable research question

Можно ли на frozen B1–B4 outputs детерминированно отделить format/ID/provenance artefacts от содержательных ошибок, сохранив заранее объявленные критерии и не изменяя модельные ответы или gold labels?

Falsifier: независимый clean replay не воспроизводит причины, provenance не восстанавливается по raw evidence, либо после разделения остаются те же категории false fail/false pass без объяснимого изменения coverage.

## CDD implementation issue pack

α реализует `offline-eval-v3.js`, schema/contract и fixtures. Обязательные acceptance criteria:

1. Input contract принимает frozen aggregate, dataset, oracle, raw manifest, evaluator version и source snapshot; сверяет SHA-256 и отказывается объединять разные run IDs.
2. Extraction scoring сопоставляет facts по relation, arguments, polarity, modality, interval и source turn; claim ID только provenance link. Один-to-one matching, duplicates и unsupported facts считаются раздельно.
3. Answer scoring хранит legacy string exact отдельно от structured/content result. Каждая метрика содержит numerator, denominator, eligible_count, unknown_count, coverage; нулевой denominator даёт `null`.
4. Missing/ambiguous provenance, missing raw или unparseable answer дают `unknown`/`indeterminate`, не автоматический fail или pass.
5. Исправления/supersession, unresolved conflict, clarification и stale-answer fixtures ловятся независимыми sentinels.
6. Replay не вызывает provider/network, не делает retries, не меняет aggregate/raw/oracle и выдаёт новый versioned artifact с reason/evidence refs.
7. Один offline command и deterministic output hashes документированы; dashboard читает только этот artifact и показывает legacy/replay/post-hoc границы раздельно.

Non-goals: LLM-as-judge; новая модельная выборка; изменение thresholds; исправление runtime memory; семантические алиасы `uses=knows_technology`; доказательство PAM-C1; publication statistics.

## Alpha dispatch prompt

Read first: `evaluation-contract-repair-v3.md`, `.cdr/POLICY.md`, `.cdr/waves/prolog-memory-eval-v0/status.md`, `cds-handoff-contract-v2.md`, CDR α and CDD α skills.

Implement only the CDD issue pack above. Treat `reports/live-20260905-152059/` as frozen historical evidence. Do not call Codex/provider or alter the old aggregate. Return: source snapshot/commit, changed files, command, test output, replay artifact/hash, sentinel failures, unknown coverage, and explicit limits. Do not issue a CDR claim or β verdict.

## Beta dispatch prompt

Start only after α returns an immutable source snapshot and replay artifact. Read the proposal, this dispatch, `.cdr/POLICY.md`, the dataset/oracle/raw manifest, and CDR β/CDD β skills. Use a fresh session and clean copy; do not read α hidden rationale. Check every acceptance criterion, rerun offline only, verify frozen inputs and deterministic hashes, attempt to break one-to-one matching, unknown handling, stale replacement, conflict, ambiguity, text-vs-envelope and cross-run isolation. Return typed findings and `GO | REVISE | NO-GO | INDETERMINATE`; no LLM judge, no live provider, no threshold changes.

## CDR boundary and triage

This MCA may transmit only a claim about evaluator adequacy. It cannot transmit that B4 improves memory answers. The historical dashboard's qualitative explanations remain `inferred` and are not replay metrics.

| Finding | Type | Disposition |
|---|---|---|
| Exact string comparison penalises equivalent answer forms | cdd-metric-gap | α patch in v3; legacy metric retained |
| Runtime/gold claim IDs differ | cdd-metric-gap | α patch: field matching + provenance ledger |
| `correction-02` old Atlas passes stale check | cdd-metric-gap | α fixture + REVISE if unresolved; runtime repair separate |
| Ambiguous `they` accepted as durable fact | research-method gap | fixture and explicit unknown/clarify status; no automatic LLM judge |
| Missing answer provenance fields | cdd-contract-gap | future answer-v3 envelope MCA; v3 records unknown |
| Raw source path under `/tmp` | cdd-tooling-gap | archived manifest already prepared; β verifies portability |

No closure now. After α and fresh β, γ must emit a typed receipt with evidence boundary matching the verdict. Any protocol-gap finding requires an iteration artifact; silence is not a disposition.

## δ routing note

δ may route α first and β only after the immutable α handoff exists. γ does not invoke agents, provider calls, or release/tag mechanics. If input hashes or raw files are unavailable, δ returns `INDETERMINATE` to γ; no reconstruction from dashboard text is allowed.
