# Product extraction v3 evaluation v1

Nine frozen turns from the pre-existing extraction annotation pilot were sent
individually to `gpt-5.6-luna`. The prompt contained only the product v3
contract and the current source turn. Gold assertions and source spans were
used after collection by the local scorer. All nine calls completed, 27 raw
prompt/stdout/stderr artifacts were retained, and no candidate was admitted.

## Results

| Metric | Result |
|---|---:|
| Write/no-write boundary | 8/9 (88.9%) |
| Exact semantic assertion set | 8/9 (88.9%) |
| Assertion precision | 6/7 (85.7%) |
| Assertion recall | 6/6 (100%) |
| Validator v1 admission eligibility | 9/9 (100%) |
| Exact annotated evidence span | 2/6 (33.3%) |
| Evidence span containment overlap | 6/6 (100%) |
| Ontology candidates | 1 |

The low exact-span score is mostly boundary punctuation or inclusion of the
subject; all six semantically matched assertions used spans overlapping the
annotated supporting text.

The sole semantic error is `extract-07`:

> Alex works with me. They use Python.

The candidate emitted `uses(alex,python)` with evidence `They use Python.` and
also proposed `works_with_person/2`. The source span is verbatim but does not
ground the identity `alex`; the annotation requires clarification. This is a
direct counterexample to treating schema validity plus textual provenance as
semantic validity.

Validator v2 adds a conservative, non-repairable
`unresolved_pronoun_subject` diagnostic for a normalized third-person subject
whose evidence begins with a pronoun. A zero-call post-hoc replay changes
eligibility from 9/9 to 8/9, catches the one observed semantic error, and
rejects none of the eight exact cases. Because the rule was designed after
seeing this miss, that replay is diagnostic only. It needs a new frozen control
set before any broader claim.

## Evidence boundary

This is a nine-case authored engineering pilot. It does not estimate real-world
accuracy, distinguish `ignore` from `clarify` when both require no write, test
repair, or establish solver benefit.

- Live report SHA-256: `3e060b5a42b43376a715e4adfcceb3c9f4845527718e2066f59e4490fd03ec2b`.
- Validator-v2 replay SHA-256: `7492e2285f0340a63428e7531d4337bacefa12a848dab54249b0f266383e9a45`.
- Frozen collector snapshot SHA-256: `e668ebf36d524dd7b8b7974252309b86b5af940a50688da813e6b46a22169db4`.
- Validator-v1 reconstruction SHA-256: `825fdc2834177619d3aa71d87d872d2a78ef330a50ca859b806194ab05569bbc`.

The validator dependency was not separately hashed before the live calls. Its
v1 implementation was reconstructed immediately afterward and reproduces the
stored scores exactly. The manifest records this as a provenance limitation;
the report and all provider receipts remain unchanged.

Verify the live report and all raw artifact hashes without a provider call:

```sh
node verify-product-extraction-v3-eval.cjs \
  reports/product-extraction-v3-eval-v1/luna/report.json \
  .cdr/waves/product-extraction-v3-eval-v1/fixture.jsonl \
  .cdr/datasets/extraction-annotation-pilot-v1.jsonl
```
