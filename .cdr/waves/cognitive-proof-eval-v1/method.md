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

For every case, before any model output, the live operator pins the same
accepted-snapshot bytes, snapshot SHA-256, query bytes, answering model
identifier, model/provider adapter, sampling policy, base answer prompt and
wrapper hashes, retry policy, selected effective measured context budget `E`,
and that case's fixed evidence-slot size.

| Condition | Answering-model material |
| --- | --- |
| P0 | normalized serialization of exactly that accepted snapshot and query, plus the pre-registered evidence slot filled only with the inert `~` control marker |
| P1 | byte-identical P0 material except that the same slot contains the `runTrustedQuery` proof DAG or bounded missing-goal result followed by deterministic `~` padding |
| PX | P1 plus separately labelled transcript capacity; exploratory only, never a primary baseline |

The slot grammar is fixed as `base(snapshot, query) + SLOT + suffix`, where
`SLOT` has its case-specific declared size. P0 uses exactly `~` repeated to
that size. P1 serializes only the trusted proof/missing result in that slot,
then uses `~` for the remaining capacity. A trusted result that exceeds the
slot makes the case `unavailable`; it is not truncated and cannot enter P0/P1
scoring. The offline fixture uses `offline-utf8-byte-v1` (one UTF-8 byte is
one accounting unit) solely to make this prospective contract deterministic;
it is explicitly not a provider/model tokenizer or a live `E` measurement.

The future harness must record an equality digest for snapshot/query/model/
base-and-wrapper-prompt/sampling/slot-size/measured-`E` fields in P0 and P1.
It measures every request's `E` before scoring and rejects P0/P1 if the
measured values differ. It must also reject any mutation outside `SLOT`, an
unequal slot, an overlong proof, or an oracle/control leak. The P0 control
contains no oracle labels, answer contract, category, expected result, or
semantic evidence. PX may differ only by its separately labelled transcript
capacity and cannot select or support the primary comparison.

The answer prompt states that accepted serialization and P1 proof/missing
result are trusted, while PX transcript is untrusted. It must not contain
`expected_result`, its SHA-256, `hidden_answer_contract`, category labels, or
any oracle-only field. The offline slot validator rejects those fields in P0
or P1 assembled material; a future CDS leakage sentinel must parse every live
assembled model prompt and abort before a call when one appears.

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
cannot change that result. `validate-equal-budget-slots-v1.js` also assembles
all 12 P0/P1 pairs using the pre-registered slots and rejects overlong proofs,
unequal slots, outside-slot mutation, and control or oracle leakage. These
checks establish only the offline byte-accounting contract, not provider token
equality or a model's understanding. Provider measurement, live prompt
assembly and fresh CDR beta remain future work.
