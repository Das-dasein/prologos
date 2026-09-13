# Temporal reasoning stress v1 — Luna smoke

Status: completed two-case transport and scoring smoke; not a benchmark result.

The smoke selected the shortest chain with a positive-to-negative seed
replacement and the deepest conjunction-join case with a bridge-rule
withdrawal. All six P0/P1/P2 calls completed with one physical dispatch, no
retry, no fallback and no tools. After applying the preregistered support-set
meaning, every condition returned the correct status and exact support set.

The initial strict parser rejected two otherwise correct responses because
they used spaces after commas. Since the prompt required comma-separated IDs
but did not ban that whitespace, the parser now normalizes it. The original
derived report is retained at
`luna-smoke-20260913-v1/report-strict-parser.json` with SHA-256
`7985621cbd4dbc0d4bf625078e4a52523c216080e335c3efa21253d53a47176c`.
Raw adapter evidence was not edited. The rescored report independently replays
to 2/2 exact in P0, P1 and P2.

This smoke demonstrates transport, evidence retention and scorer behavior. Two
selected cases cannot estimate condition accuracy or a P1-to-P2 difference.
