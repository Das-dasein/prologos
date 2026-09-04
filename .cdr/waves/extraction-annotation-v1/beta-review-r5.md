# CDR beta review R5: extraction-annotation-v1 / issues #5 and #20

## Review identity and scope

- Role: independent CDR beta; fresh pass on the final alpha repair.
- Branch: `cycle/20`; exact reviewed head:
  `33637131c71ec5130d2abe483d78b2fbb91098e1` (matches `origin/cycle/20`).
- Review base refreshed: `origin/main=458d917798281e30cdab70df84dab1da8d877a68`.
- Scope: only prior F1-F4; no provider/live run, private-memory access,
  method/dataset edit, merge, or issue closure.

## Terminal verdict

**REVISE**

F1 and F2 are materially repaired: scope/qualifier defaults and value checks
run, and `toV2` now emits the required v2 schema version plus object-shaped
profile identity with the pinned SHA. Matrix A now emits rates and Matrix B
has explicit B1-B4 `N/A` and B5 oracle surfaces. Two contract-critical metric
defects remain: Matrix A reports rate `1` for zero-denominator inapplicable
cells instead of `N/A`, and B5 uses hard-coded denominators that disagree with
the pinned gold operations/provenance/conflict counts. These make the emitted
matrix numerically misleading and block certification.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | REVISE | Annotation dimensions, v2 envelope shape, dataset SHA/category/turn gates, Matrix A rates, and B1-B5 surfaces are executable. Zero-denominator semantics and B5 denominator derivation are still false for the pinned fixture. |
| Diagnostic oracles | REVISE | `test:cdr-annotation`, `test:cdr-matrix`, and `test:cdr-gold` pass, but tests do not assert `N/A` rates or B5 denominator integrity. Full `npm test` is blocked by missing `tau-prolog`. |
| Reproduction from clean | PASS for bounded structural/gold slices; REVISE for matrix correctness | All three CDR commands reproduce from this checkout. The matrix output reproduces the defects below; it is not yet a trustworthy metric oracle. |
| Citation integrity | PASS, bounded | No external empirical result is invoked; local policy, schemas, manifests, issue contracts, and harnesses are the authorities. |
| Data-policy compliance | PASS | Synthetic fixtures, manifest hashes, and private-marker gates pass; no provider/private memory used. |
| Claim/evidence alignment | REVISE | The code supports structural repair claims, but not the claim that all declared matrix denominators/applicability rules are faithfully implemented. |

## Reproduction record

```text
git fetch --verbose origin cycle/20
=> origin/cycle/20=33637131c71ec5130d2abe483d78b2fbb91098e1
git rev-parse HEAD
=> 33637131c71ec5130d2abe483d78b2fbb91098e1
npm run test:cdr-annotation
=> exit 0; cdr annotation ok
npm run test:cdr-matrix
=> exit 0; gold_contract_valid; 12 cases; 36 turns; six categories
npm run test:cdr-gold
=> exit 0; gold-injection status=ok; source_commit=3363713...
npm test
=> exit 1; Cannot find module 'tau-prolog' (node_modules absent)
git diff --check origin/main...HEAD
=> exit 0
```

## Findings

### F1 — Scope/qualifier dimensions and defaults are validated

Status: **CLOSED (bounded)**. `validateRecord` materializes missing fields
using the declared defaults (`self`, or `interval` for interval time) and
rejects values outside the contract sets. Existing annotation tests pass.

### F2 — v2 envelope/profile identity repair is present

Status: **CLOSED (bounded)**. `toV2` emits `schema_version: "memory-extraction-v2"`
and an object-shaped `registry_identity` with
`name: "prologos_agent_memory"`, version `1.0.0`, and pinned SHA
`40558d46e4e73028cc19e5f97cdaf316833f74b916f76552f6443e8d5312e3a0`.
Unknown relation and arity checks remain present. A schema-validator test would
be useful hardening, but the prior envelope-shape blocker is closed.

### F3 — Zero-denominator Matrix A cells violate the declared N/A rule

Severity: blocking. Classification: metric applicability / diagnostic oracle.

For `non-memory content` and `alias/coreference ambiguity`, the output has
`denominator: 0` but emits `rate: 1` for `assertion_exact_match`, predicate,
arguments, polarity, time, modality, and provenance. The gamma contract states
that an inapplicable cell is `N/A`, never zero (and never a fabricated rate).
The harness must emit an explicit `N/A` representation, e.g. `rate: null` plus
`status: "N/A"`, for every zero-denominator cell, and tests must assert it.

### F4 — B5 oracle denominators are hard-coded and wrong for the pinned data

Severity: blocking. Classification: denominator integrity / claim-evidence
alignment.

The pinned dataset contains 16 `write` operations/assertions, 2 conflict
cases, and 6 provenance-bearing written claims. B5 currently reports
`write_precision`/`write_recall` denominators 12, `conflict_accuracy`
denominator 4, and `provenance_completeness` denominator 8. These constants do
not derive from the dataset and contradict its declared operation/provenance
records. Derive every B5 numerator/denominator from the pinned gold structures;
retain `N/A` when applicable. B1-B4 `N/A` surfaces are appropriate because no
candidate runs were supplied.

## Passing boundaries and non-results

- Annotation SHA `7cf87a0f...` and matrix SHA `ed9dd7f7...` match manifests.
- Matrix shape remains 12 cases, 36 turns, six categories, two cases and six
  turns per category.
- Gold injection is an oracle-ceiling check, not live model or extraction
  quality evidence.
- No precision/recall, baseline comparison, stale/contradictory error,
  utility, threshold, causal, or novelty claim is established.

## Required next action

Return F3-F4 to alpha/gamma for bounded metric repair and obtain a fresh
independent beta review. This beta does not edit method/dataset, invoke a
provider, merge, or close either issue.
