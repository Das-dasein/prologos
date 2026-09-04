# CDR beta review R4: extraction-annotation-v1 / issues #5 and #20

## Review identity and scope

- Role: independent CDR beta; fresh pass after alpha commits `3c0e9ef` and
  `7e747e1`. No alpha/gamma/delta/method/dataset authorship.
- Branch: `cycle/20`; exact reviewed head:
  `7e747e153be57abccb1007e74908644b1d8b02e7` (matches `origin/cycle/20`).
- Review base refreshed: `origin/main=458d917798281e30cdab70df84dab1da8d877a68`.
- No provider/live call, private-memory access, dataset/method edit, merge, or
  issue closure.

## Terminal verdict

**REVISE**

The new validator now materializes and validates `scope` and `qualifier`
dimensions, including defaults, and the matrix continues to reproduce the
pinned 12-case/36-turn/six-category dataset shape and SHA. The repair does not
close the prior review: the v2 adapter envelope is still not valid against the
declared extraction schema/profile identity, and the matrix emits placeholder
numerators rather than calculating the declared Matrix A/B cells. These remain
blocking contract and claim/evidence-alignment findings.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | REVISE | Scope/qualifier values are now checked by `validateRecord`; hash/category/shape checks pass. v2 identity and full matrix quality cells remain untestable through the shipped outputs. |
| Diagnostic oracles | REVISE | Annotation, matrix, and gold-injection tests pass. No schema validation of the emitted v2 envelope, identity/hash-drift test, or non-null Matrix A/B scoring diagnostic is present. |
| Reproduction from clean | PASS for bounded structural slices; REVISE for declared matrix oracle | `test:cdr-annotation`, `test:cdr-matrix`, and `test:cdr-gold` pass at this head. Full `npm test` remains environment-blocked because `node_modules`/`tau-prolog` is absent. |
| Citation integrity | PASS, bounded | No external empirical result is invoked; local policy, schemas, manifests, issues, and harnesses are the authorities. |
| Data-policy compliance | PASS | Synthetic manifests and SHA gates pass; no provider or private memory was used. |
| Claim/evidence alignment | REVISE | Alpha's structural repair claims are partly supported (scope/qualifier validation and dataset integrity), but not the claimed v2 compatibility or executable full matrix contract. |

## Reproduction record

```text
git fetch --verbose origin cycle/20
=> origin/cycle/20=7e747e153be57abccb1007e74908644b1d8b02e7
git rev-parse HEAD
=> 7e747e153be57abccb1007e74908644b1d8b02e7
npm run test:cdr-annotation
=> exit 0; cdr annotation ok
npm run test:cdr-matrix
=> exit 0; gold_contract_valid; SHA ed9dd7...; 12 cases; 36 turns;
   six categories, six turns each; cells include denominators and null numerators
npm run test:cdr-gold
=> exit 0; gold-injection status=ok; source_commit=7e747e1...
npm test
=> exit 1; Cannot find module 'tau-prolog' (node_modules absent)
git diff --check origin/main...HEAD
=> exit 0
```

## Findings

### F1 — Scope/qualifier validation is closed, bounded to the validator path

Status: **CLOSED (bounded)**. `validateRecord` now materializes missing
`scope`/`qualifier` fields using the declared defaults (`self`, or `interval`
for interval time) and rejects values outside the contract sets. Existing
annotation tests pass. This closes the prior dimension-presence gap for JSONL
records. Direct callers of `toV2` can still bypass `validateRecord`, so the
adapter should either validate its input or document that validated records are
required; this is a hardening note, not the terminal blocker in this review.

### F2 — v2 adapter envelope still violates the declared schema/profile identity

Severity: blocking. Classification: wire-contract / implementation
compatibility.

`toV2` now emits `schema_version: "memory-extraction-v2"` and a `proposal`,
but emits `registry_identity: "conversation_profile@1.0.0"` as a string. The
declared `schemas/memory-extraction.schema.json` requires an object containing
`name`, `version`, and pinned SHA `40558d46e4e73028cc19e5f97cdaf316833f74b916f76552f6443e8d5312e3a0`,
with `name: "prologos_agent_memory"`; the active profile likewise identifies
`prologos_agent_memory@1.0.0`. No test validates the returned envelope against
the schema or checks identity/hash drift. The adapter therefore still cannot
be certified as v2/profile-compatible.

### F3 — Matrix scorer still emits placeholder numerators and no Matrix B cells

Severity: blocking. Classification: metric contract / diagnostic oracle.

The matrix patch adds `cells` with denominators, but every numerator is `null`;
`metrics` remains only a list of names. It does not compute decision,
assertion exact match, write P/R, field metrics, hallucination, or false
clarification. Matrix B has no per-condition cell output at all. The gamma
contract's requirement for reproducible numerator/denominator/rate and explicit
`N/A` applicability is therefore still not implemented; only denominators and
gold shape are checked.

### F4 — Denominator counters remain structurally underived for future cases

Severity: blocking. Classification: denominator integrity.

`assertions` is still calculated by counting `gold_operations` with
`kind === "write"`, which happens to equal proposals for this fixture but is
not an assertion count when a write turn contains multiple assertions.
`durable_turns` is hard-coded to zero for the ambiguity category rather than
derived from the declared `D_k` predicate. The current denominators are
reproducible for this fixture, but not a faithful executable implementation of
the registered units. Derive them from operation/proposal structure and emit
the declared `N/A` semantics per cell.

## Passing boundaries and non-results

- Annotation SHA `7cf87a0f...` and matrix SHA `ed9dd7f7...` match manifests.
- Scope/qualifier defaults and allowed values are now validator-enforced.
- Gold injection passes all 12 cases; this is an oracle-ceiling check, not live
  model or extraction-quality evidence.
- No precision/recall, baseline comparison, provenance rate,
  stale/contradictory error, utility, threshold, causal, or novelty claim is
  established.

## Required next action

Return F2-F4 to alpha/gamma for bounded repair, then obtain a fresh independent
beta review. This beta does not edit method/dataset, invoke a provider, merge,
or close either issue.
