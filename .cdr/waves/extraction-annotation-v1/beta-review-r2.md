# CDR beta review R2: extraction-annotation-v1 / issues #5 and #20

## Review identity and scope

- Role: independent CDR beta, fresh session; no alpha/gamma/delta duties.
- Branch: `cycle/20`.
- Reviewed head: `426f22beb7e7c29349e6d84cd76bc81abbf3f2ba` (matches the requested head and `origin/cycle/20`).
- Authorities reviewed: issue #5, issue #20, `.cdr/POLICY.md`, extraction gamma specification, alpha repair report R1, the pinned datasets/manifests, active profile, v2 schema, harness and tests.
- No dataset or method changes, provider/live-data calls, merges, or issue closure were performed.

## Terminal verdict

**REVISE**

The repair adds useful contract artifacts and the annotation structural oracle
passes, but F1-F4 are not fully closed. In particular, the Matrix A source
manifest hash is stale, the matrix's declared turn denominator is arithmetically
wrong, scope/qualifier are not represented or validated on v1 assertions, and
the claimed v2/profile identity binding is not enforced by `toV2`.

## Oracle and reproduction results

| Oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | REVISE | The contract lists six categories, but no executable validator consumes the Matrix A dialogue records, checks their category/hash binding, or emits the full Matrix A cells. The written denominator is also wrong. |
| Diagnostic oracles | REVISE | `test-cdr-annotation.js`, direct annotation validation, seeded scorer, and `test:cdr-gold` pass. The scorer only emits decision category metrics for the nine-record fixture, not the declared full matrix or field metrics. |
| Clean reproduction | REVISE | `npm run test:cdr-annotation` PASS; `npm run test:cdr-gold` PASS at the reviewed commit; `npm test` is blocked by missing `tau-prolog` (`MODULE_NOT_FOUND`). Matrix manifest hash check fails independently. |
| Data policy | PASS, bounded | Fixtures are synthetic and private-marker checks pass; no provider or private memory was used. |
| Claim/evidence alignment | REVISE | Alpha report claims F1-F4 close at contract level, but executable checks do not establish all mappings, dimensions, or matrix formulas claimed there. |

Observed deterministic checks:

```text
node test-cdr-annotation.js                         PASS; cdr annotation ok
node cdr-annotation-harness.js .cdr/datasets/extraction-annotation-pilot-v1.jsonl
                                                     PASS; 9 records; SHA 7cf87a...
npm run test:cdr-gold                                PASS; 12 cases; source commit 426f22b...
npm test                                             BLOCKED; Cannot find module 'tau-prolog'
git diff --check origin/main...HEAD                  PASS
dialogues-pilot records/categories/turns             12 / 6x2 / 36
manifest SHA vs actual dialogues SHA                 88776d... vs ed9dd7...
```

## Findings

### F1 — Matrix A category/hash authority is not executable and its source hash is stale

Severity: blocking. The new gamma clarification names
`.cdr/datasets/dialogues-pilot-v1.jsonl` as Matrix A authority and requires a
category/hash gate, but no validator or test performs those checks. The manifest
declares SHA-256 `88776d46d0ddd34307ef4cfd519e68f17862fd51118463a0ef9497cd25ba0f9f`,
while the checked-out file hashes to
`ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041`. The file
does contain six categories exactly twice, but that observed shape cannot repair
the missing integrity gate. Add a pinned, checked hash and deterministic
category validator before Matrix A is an oracle.

### F2 — Scope and qualifier remain prose/defaults, not annotation dimensions

Severity: blocking. The contract lists `scope_values` and `qualifier_values`
and `toV2` supplies defaults, but v1 assertion objects contain neither
`scope` nor `qualifier`; `validateRecord` does not validate either dimension.
Consequently a candidate cannot be scored for a scope error, qualifier error,
or missing qualifier as required by issue #5 AC2. `gamma-spec.md` also retains a
taxonomy without `scope` and `qualifier`. Add explicit fields (or an explicit,
machine-checked derivation rule plus seeded positive/negative cases) and include
both dimensions in the scorer's error taxonomy without collapsing them into
`time`.

### F3 — v1→v2/profile mapping does not actually bind the active profile identity

Severity: blocking. `toV2` checks relation membership and arity against the
conversation layer, but returns only an assertion-shaped object: no
`schema_version` or `registry_identity` is emitted, and no check compares the
declared active profile (`ontology/active-profile-v1.json`) to the v2 registry
identity/hash required by `schemas/memory-extraction.schema.json`. The contract
pins the conversation-layer hash while labelling it
`prologos_agent_memory@1.0.0`; the v2 schema pins a different registry hash
(`40558d46...`). Thus the report's claim that `toV2` pins active profile
identity/hash is not true. Define the exact adapter envelope and assert it
against the active profile and v2 schema, with tests for identity/hash drift and
unknown/arity-invalid relations.

### F4 — Matrix formulas/applicability have a wrong denominator and incomplete executable coverage

Severity: blocking. `gamma-clarification-matrix-r1.md:33-36` says `N_k` is the
number of dialogue turns and that there are 24 total, but the pinned source has
12 dialogues × 3 turns = 36 turns (6 per category). This makes the declared
Decision denominator wrong. Further, the implementation emits only
`category_metrics.*.decision`; it does not emit the declared assertion exact
match, write P/R, field-level, hallucination, or false-clarification cells, nor
Matrix B applicability/denominators. The prose formulas are not enough to make
those cells reproducible. Correct the unit/count and provide a deterministic
full-cell scorer, or explicitly narrow the current contract and alpha claims.

## Non-results and required action

No extraction quality, precision/recall, baseline comparison, live model result,
utility claim, or threshold result is established. `npm test` remains an
environment-blocked check because `tau-prolog` is absent; `test:cdr-gold` is a
separate deterministic gold-injection check and does not establish live quality.

Return F1-F4 to alpha/gamma for a bounded repair, then obtain another fresh
independent beta review. Do not merge or close issues from this review.
