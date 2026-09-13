# Open-choice Hermes experiment v1

The two Hermes sessions received only a situation and goal. The prompt named no
memory tool, Prolog query, action vocabulary, or choice policy.

- H1 called `world_memory_query`, found `release(orion)` unknown through
  `old_release_rule` because `backup_ready(orion)` was missing, and chose to
  verify backup readiness while pausing release.
- H2 independently formulated the same query, obtained a safe proof through
  the old certified-route rule, and chose to allow release.

Both query receipts contain the exact snapshot, proof or missing-premise plan,
source identities, rule identity, and checker hashes. The two histories and
current situation were synthetic. This run demonstrates autonomous query and
next-action selection inside Hermes for this bounded episode; it does not show
spontaneous goal formation or generalize beyond the tested projection.

The harness initially exited nonzero because its lexical classifier interpreted
the Russian phrase `статус запроса` as the action `запросить выпуск`. The raw H1
answer explicitly pauses release and requests backup verification. The recorded
`observed.H1` label was corrected after fixing that deterministic classifier;
the model was not rerun.
