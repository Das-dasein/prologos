# Measurement clarification R1 — v1.0.1

Changelog: v1.0.1 binds root-literal questions to the existing policy oracle.

Independent beta reported that BEHAVIOR_SYSTEM requires a stated rule path for
every question, whereas p06_b, p07_b and p08_b ask the unknown query itself.
The declared WorldAgent policy supports a root missing-literal plan when no
rule derives that literal. These fixture oracles and the existing policy are
the source of truth; the prompt restriction is not an intended task constraint.

Repair decision: after beta's consolidated findings, engineering alpha must
align the model-facing task definition with the full existing missing-premise
policy, including a permitted root-literal question. Do not alter the gold
labels. Verify both rule-premise and root-literal asking, unaskable unknown,
explicit contradiction and raw conflict. Keep old smoke artifacts immutable;
a revised prompt receives a new version/hash and fresh run directory.

This is a measurement-contract repair before full evaluation, not a response to
model accuracy on those cases. No full Luna comparison has run on them yet.
The final beta finding list may add further bounded repairs.
