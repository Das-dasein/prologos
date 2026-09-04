# CDR beta review R6: extraction-annotation-v1 / issues #5 and #20

## Review identity and scope

- Role: independent CDR beta; fresh pass after the gamma denominator repair.
- Branch: `cycle/20`; exact reviewed head:
  `566dbb5a4c926c4c2c72c2e72941c32c8af29797` (matches `origin/cycle/20`).
- Review base refreshed: `origin/main=458d917798281e30cdab70df84dab1da8d877a68`.
- Scope: prior F1-F4 only. No provider/live run, private-memory access,
  method/dataset edit, merge, or issue closure.

## Terminal verdict

**APPROVED — BOUNDED-GO**

The repaired annotation and matrix contracts are now structurally coherent for
the pinned synthetic fixture. Scope/qualifier dimensions are materialized and
validated; `toV2` emits the v2 envelope/profile identity; Matrix A emits rates
with `null`/N-A for empty denominators; and Matrix B explicitly distinguishes
candidate-unavailable B1-B4 from the B5 gold oracle. B5 denominators are derived
from the pinned gold data and reproduce 16 writes, 2 conflict cases, and 6
provenance-bearing claims. This approval is bounded to contract/gold-oracle
readiness: no live extractor quality, baseline comparison, or architecture
benefit claim is established.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | The annotation dimensions, v2 envelope, pinned dataset SHA/category/turn gates, Matrix A numerators/denominators/rates, and B1-B5 surfaces are executable. Live candidate metrics remain absent by design. |
| Diagnostic oracles | PASS, bounded | Annotation, matrix, and gold-injection tests pass; empty cells now emit `rate: null`, and B5 derives its key denominators from gold structures. Full repository tests remain environment-blocked by missing `tau-prolog`. |
| Reproduction from clean | PASS for the declared structural/gold slice | `test:cdr-annotation`, `test:cdr-matrix`, and `test:cdr-gold` reproduce successfully at the reviewed SHA. This does not reproduce a provider/model run. |
| Citation integrity | PASS, bounded | No external empirical result is invoked; local policy, schemas, manifests, issue contracts, and harnesses are the authorities. |
| Data-policy compliance | PASS | Synthetic fixtures, manifest hashes, and private-marker gates pass; no provider or private memory was used. |
| Claim/evidence alignment | PASS, bounded | The evidence supports structural oracle readiness and the gold-oracle ceiling only; it does not support model quality or comparative efficacy claims. |

## Reproduction record

```text
git fetch --verbose origin cycle/20
=> origin/cycle/20=566dbb5a4c926c4c2c72c2e72941c32c8af29797
git rev-parse HEAD
=> 566dbb5a4c926c4c2c72c2e72941c32c8af29797
npm run test:cdr-annotation
=> exit 0; cdr annotation ok
npm run test:cdr-matrix
=> exit 0; gold_contract_valid; 12 cases; 36 turns; six categories;
   zero-denominator rates null; B1-B4 N/A; B5 writes=16, conflicts=2,
   provenance=6
npm run test:cdr-gold
=> exit 0; gold-injection status=ok; source_commit=566dbb5...
npm test
=> exit 1; Cannot find module 'tau-prolog' (node_modules absent)
git diff --check origin/main...HEAD
=> exit 0
```

## Finding closure

### F1 — Scope/qualifier dimensions and defaults

**CLOSED.** `validateRecord` materializes missing fields using the declared
defaults and rejects values outside the contract sets. Annotation tests pass.

### F2 — v2 schema/profile identity envelope

**CLOSED (bounded).** `toV2` emits `schema_version: "memory-extraction-v2"`
and object-shaped `registry_identity` with `prologos_agent_memory@1.0.0` and
the pinned v2 SHA. Unknown relation and arity checks remain enforced. A full
JSON-Schema validator test would be useful future hardening, but the reviewed
envelope now matches the declared shape and identity.

### F3 — Matrix A cells and empty-denominator semantics

**CLOSED.** Matrix A emits numerator, denominator, and rate for the gold
structural slice. For non-memory and ambiguity categories, inapplicable cells
have denominator zero and `rate: null`, satisfying the explicit N/A rule;
applicable cells emit rate 1 for the gold oracle.

### F4 — Matrix B and assertion denominators

**CLOSED (bounded).** Assertion counts support proposal arrays and are no longer
implicitly limited to one assertion per write operation. B1-B4 are explicit
`N/A` because no candidate runs are supplied. B5 derives and reproduces 16
write operations, 2 conflict cases, 6 provenance claims, and the corresponding
gold-oracle rates. The result is a gold ceiling, not a live comparison.

## Boundaries and non-results

- Annotation SHA `7cf87a0f...` and matrix SHA `ed9dd7f7...` match manifests.
- Matrix shape is 12 cases, 36 turns, six categories, two cases and six turns
  per category.
- No precision/recall from a model, baseline comparison, stale/contradictory
  error result, utility, threshold, causal, or novelty claim is established.
- `npm test` could not run because this clean worktree lacks `node_modules` and
  `tau-prolog`; this is an environment limitation, not CDR evidence.

## Close-out

The prior F1-F4 findings are closed for the bounded synthetic contract slice.
The matrix is ready to receive separately pinned candidate/provider runs under
the project policy, with B1-B4 remaining N/A until such runs exist.
