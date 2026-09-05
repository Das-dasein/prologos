# Trusted-proof cognitive-memory evaluation v1

Status: `hypothesized`, prospective, offline protocol. This is a distinct
issue #26 wave; it does not repair, re-score, or alter the historical
`prolog-memory-eval-v0` wave, which remains `REVISE`.

## Sources and unit

The deterministic core is pinned to source commit
`82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`; the cognitive-memory boundary is
defined in `.cdd/designs/prolog-cognitive-memory-v1.md`. One future unit is one
synthetic case's accepted snapshot, fixed query, and one answer request. The
offline fixture has no provider output and establishes only symbolic behavior
for its 12 listed examples.

## Pre-registered conditions

For every case, the live operator pins the same accepted-snapshot bytes,
snapshot SHA-256, query bytes, answering model identifier, model/provider
adapter, sampling policy, base answer prompt and wrapper hashes, retry policy,
and selected effective measured context budget `E`.

| Condition | Answering-model material |
| --- | --- |
| P0 | normalized serialization of exactly that accepted snapshot and query, with no proof and no thought transcript |
| P1 | byte-identical P0 material plus only the `runTrustedQuery` proof DAG or bounded missing-goal result |
| PX | P1 plus an explicitly labelled untrusted thought transcript; exploratory only, never a primary baseline |

The harness must assemble P0 once and derive P1 by append-only trusted proof
context. It must record an equality digest for snapshot/query/model/prompt/
sampling/budget fields in P0 and P1. It measures every request's `E` before
scoring and rejects P0/P1 if the measured values differ. PX may differ only by
its labelled transcript and cannot select or support the primary comparison.

The answer prompt states that accepted serialization and P1 proof/missing
result are trusted, while PX transcript is untrusted. It must not contain
`expected_result`, its SHA-256, `hidden_answer_contract`, category labels, or
any oracle-only field. A future CDS leakage sentinel must parse every assembled
model prompt and abort before a call when one appears.

## Scoring and falsifiers

The later run independently scores final answers against hidden answer and
provenance contracts, retaining raw answer, exact prompt hash, usage, measured
`E`, snapshot hash, query, proof result, and scorer decision per request.
Report answer error and provenance completeness with numerator/denominator;
do not turn the symbolic oracle into an answer score.

The primary hypothesis is falsified for the declared fixture/model scope if P1
does not reduce answer errors relative to P0 under the identical controls, or
if the difference disappears after an extraction, prompt, budget, provenance,
or leakage failure. A nonzero result in PX is exploratory and cannot rescue or
replace P0/P1. Any missing raw artifact, unequal `E`, altered snapshot/query/
model/prompt, oracle leakage, or absence of a fresh beta reproduction leaves
the result `INDETERMINATE` or `REVISE`, not positive.

## Offline evidence and limits

`validate-trusted-proof-eval-v1.js` verifies the fixed fixture with
`runTrustedQuery`, including unknowns, revisions, direct temporal conflicts,
and provenance. For each thought case, it runs a deliberately forged
full-Prolog candidate in the isolated untrusted runner, then reruns the
trusted query from the same immutable accepted snapshot; the forged transcript
cannot change that result. This does not test a model's understanding, prompt
assembly, context equality, or usefulness. Those are explicit future CDS/live
and fresh-CDR-beta work.
