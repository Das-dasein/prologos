# Temporal relational stress v2 — pre-run smoke

Status: completed engineering smoke; excluded from benchmark estimates.

The first two-case, eight-call smoke used fixture SHA-256
`5548271441e7ef641f37b2032ffba0cc63e943ffe8332b15d16c85bec0538df4`.
All calls were runtime-valid and retained with report SHA-256
`46b799371883f04f0d5d3062290558eb1311df2c74fd54d4a1785e830faf219c`.

The shallow entailed case produced the correct status in P0, P1, P1F and P2.
The deep conflict case produced `true` in P1 and `both` in P0/P1F, while P2
returned the required `conflict`. Those first three labels are compatible with
the intended meaning but outside the scorer vocabulary.

Audit found that the prompt named the JSON `status` field but did not enumerate
its four permitted string values. The fixture was therefore corrected before
any full run to require exactly `entailed`, `contradicted`, `unknown`, or
`conflict`. The original smoke fixture hash, prompts, raw evidence and report
remain retained. This smoke is not used as evidence for a P1-to-P2 status
effect.

The smoke also showed the intended secondary difficulty: P0/P1/P1F did not
reproduce the complete exact proof support even on the shallow case, while P2
did. Support accuracy remains secondary to the independently scored status.
