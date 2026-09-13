# Independent beta pair semantics — 2026-09-10

Dataset `8ced0edd45ca32c3843fcb0a8922a0f3c53635a8c903dedd834a0a86fa39a1e2`.
Read all 24 records including every old/current message, projection, accepted and
candidate item, extraction partition, interval, replacement, move and proof.
Verdicts below concern authored source/oracle semantics. They are independent
AI review, **human_review remains pending**. Gold and manifest were not edited.

| Pair | Independent semantic check | Verdict |
|---|---|---|
| p01 | A states only consent → publication and no consent fact, so ask consent. B adds an independent archive → publication rule and archive fact; the safe proof is exactly `f_archive,r_archive`, so act without asking consent. Same current task/policy. | APPROVE |
| p02 | Permission versus explicit denial is directly asserted by the user. A acts with `f_permission`; B pauses as contradicted with the negative `f_permission`. No absence-as-negation. | APPROVE |
| p03 | B explicitly preserves both opposing statements, avoiding implicit latest-write supersession. Raw conflict/safe unknown and conflict pause are correct; empty safe proof is correct. A has only positive support. | APPROVE |
| p04 | A conflicts readiness on the two-edge readiness→staged→release chain; B conflicts the alternative reviewed→release path. In both, audit stays uncontested and supports release with `f_audit,r_audit`. No goal negation exists, and neither tainted path is needed. The invariance label is appropriate. | APPROVE |
| p05 | B's tick-20 statement explicitly replaces the tick-1 rule; reviewed remains true, signed is missing. Old item remains historical, new rule is active. Ask signed in B; A acts with `f_reviewed,r_old`. | APPROVE |
| p06 | Inclusive endpoint 50 permits access at now=50 in A; endpoint 49 expires before now in B. B has no prohibition and may ask whether the query itself is true, according to actual WorldAgent root-plan policy. | APPROVE gold; harness prompt REQUEST CHANGES R1 |
| p07 | A expressly asserts actual availability; B expressly disclaims an actual fact and supplies only a hypothetical example, retained as uncertain candidate. A acts, B asks direct availability. Current request's final requirement for confirmed availability is read as a requirement, not a new confirmation. The adjective “доступного” is an avoidable wording ambiguity for a future dataset, not silently rewritten here. | APPROVE under stated reading; harness prompt REQUEST CHANGES R1 |
| p08 | Identical old text changes author user→assistant. User-source admission is explicit; assistant text remains reported candidate. A acts with `f_approval`; B asks confirmation, not negative inference. `approve(cobalt)` is a wire alias for the simulated permitted next action, not a real act of granting approval. | APPROVE; harness prompt REQUEST CHANGES R1 |
| p09 | The target's indefinite permission is unchanged. Other actual permissions concern birch/spruce, elm is expired, willow hypothetical. Reversal/re-timing of 28 editorial distractors changes no task-world assertion. All distractors were inspected; their names/examples do not assert access to cedar. Both proofs are `f_target`. | APPROVE gold; behavioral distractor intervention is not measured (L1) |
| p10 | Two phrasings preserve universal sufficient-condition direction and packed amber. Both proofs `f_pack,r_pack` justify shipping. Formal programs are identical; retained source wording differs. | APPROVE |
| p11 | A's explicit yes answers badge; B's explicit no answers its signed negation. Separate positive/negative entry rules justify act/contradicted pause respectively. Neither should re-ask the already answered badge question. `f_answer,r_yes` versus `f_answer,r_no` are relevant full proofs. | APPROVE |
| p12 | A lacks both premises; B gains verified but still lacks funded. No authorized question is present. Neither query nor its opposite is derived, so both pause for insufficient support. This is valid invariance despite partial knowledge gain. | APPROVE |

All accepted programs and NL renderings preserve their source meaning under the
declared restricted signed-Horn vocabulary. Historical time and replacements
are supplied to text and formal lanes in equivalent qualifiers. Candidate status
is retained, with no source-role promotion. Exactly 8 contrast and 4 invariance
pairs; all pair current contexts, times, queries, domain declarations, policies
and admission policies match. There are no competing safe proofs in these gold
cases, so requiring the authored complete proof ID set does not reject a second
valid proof within this dataset.

All 24 independently replayed journals agree with explicit active-set, raw/safe
status, complete proof/source, candidate-retention and WorldAgent next-move
oracles. This certifies consistency of these authored fixtures with this
implementation, not empirical truth, extraction performance or memory benefit.
