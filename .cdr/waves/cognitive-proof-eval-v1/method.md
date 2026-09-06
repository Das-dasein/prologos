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

Slot registration SHA-256: 4d05d2176f4e629370771925543d4670259e15b633c5ef3be47803c6c9bf9a46
`slot-registration-v1.json` is the immutable canonical registration object:
its `trusted-proof-evidence-slots-v1` protocol version and every
`case_id -> slot_bytes` entry are canonically serialized and hashed. The
dataset-derived map, the registration's self-hash, and this method and manifest
bindings must all match before assembly or scoring.

Trusted proof digest registry SHA-256:
`a68d6a010b7225f42bedb447a209e50617cd26bf2a9a6ab40aa0d40b61ae42e4`.
`trusted-proof-digest-registry-v1.json` canonically binds every `case_id` to
the SHA-256 of that case's trusted `runTrustedQuery` result, with a self-hash
and the same pinned source and dataset bindings. P1 carries exactly its
case's registered digest; P0 carries `null`.

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

## Local live-receipt intake amendment (issue #32)

Before a human-operated live run can be examined, its operator submits a
versioned `cognitive-proof-eval-receipt-intake-v1` envelope to local intake.
It binds source commit, dataset, slot-registration, and trusted-proof-digest
registry hashes; model/adapter;
base and wrapper prompt hashes; sampling; and retry policy. Every P0/P1 record
also binds canonical snapshot/query hashes, registered slot size, P1
trusted-proof hash, local raw reference and SHA-256, provider usage including
measured `E`, and a scorer decision whose opaque contract hash cannot include
hidden answer-contract text.

Raw answers remain under the operator's local `--raw-root` and are hashed
there; no raw answer or credential is committed. Before aggregation, the
intake rejects absent/duplicate P0/P1 records, all immutable-binding changes,
bad/missing raw files or hashes, a P1 digest that differs from its canonical
case registry digest, unequal measured `E`,
oracle/control leakage, and duplicate/overwritten records. A record has no
`supersedes` path: it is append-only and never replaced in place.

The denominator is exactly cases with one valid P0 and P1 after every gate; a
rejected, unavailable, or missing case contributes to neither rate nor claim.
Any incomplete intake is `INDETERMINATE`; an integrity-valid intake is still
not a result until fresh CDR beta audits local evidence. The committed fixture
is `synthetic_non_result`, has no raw file, and demonstrates parser/gates only.

## Native usage reconciliation amendment (issue #46)

`receipt-intake-v6` is a separate, forward-only envelope. It keeps every v5
wire-authority, sealed-prompt, proof, artifact, pairing and leakage gate, and
adds an independently checked native usage receipt. For `openai-api`, each
record must carry exactly `input_tokens`, `output_tokens`, and `total_tokens`:
non-negative safe integers where total equals input plus output. The measured
effective context budget `E` is also a non-negative safe integer and exactly
the provider-native `input_tokens`; intake never derives, rounds, or replaces
it from configuration. The committed synthetic non-result uses the explicit
all-zero shape. Versions v1 through v5 are invalid v6 inputs. This is local

Receipt intake v7 is a forward-only re-registration of the same native-usage
and inherited receipt gates after PR #48 repaired the pinned OpenAI Responses
usage-shape normalizer. It seals the current hashes of exactly the two wire
authority sources, preserves byte-for-byte prompt identities and sampling, and
still records only canonical input/output/total counters with E = input.
It does not collect data or call a provider; versions v1 through v6 are invalid
v7 inputs.
preparation only, not collection, aggregation, or an effectiveness claim.

## Actual assembled-prompt binding amendment (issue #35)

`receipt-intake-v2` is a separate format and never upgrades or reinterprets a
v1 envelope. It additionally pins
`actual-assembled-prompt-digest-registry-v1.json`, a self-hashing registry
rebuilt from the existing no-live sealed P0/P1 assembler for every case. A
candidate record binds its exact case/condition digest in `prompt_sha256` and
a separate local prompt artifact under `--raw-root`; intake hashes that file
and requires artifact SHA = record SHA = registered P0/P1 SHA. The registry
contains digests and template identities only, never raw prompt bytes, oracle
contracts, raw outputs, aggregation, or model/provider activity.

## Real answering-wire re-registration amendment (issue #38)

`receipt-intake-v3` is separate from v1/v2 and accepts only the self-hashing
v3 registry with PR #37's real `{{assembled_prompt}}` / `none` SHA-256 values,
pinned transport source hashes and `sealed-assembled-prompt-byte-for-byte`
input mode. It retains all prior candidate integrity gates, including exact
P0/P1 digest and local artifact verification. This is prospective preparation:
it invokes no provider or model and provides no receipt, aggregate, or claim.
