# CDR beta review R1: extraction-annotation-v1 / issue #5 and #20

## Review identity and scope

- Role: independent CDR beta; review only, not alpha, gamma, delta, or method/dataset author.
- Branch: `cycle/20`; reviewed head: `760830177ab8a5bce6b271f0bd365cf6cf017dbb`.
- Review base refreshed synchronously: `origin/main=458d917798281e30cdab70df84dab1da8d877a68`.
- Related issue bodies reviewed: GitHub #5 (annotation oracle) and #20 (linked output matrices); both were OPEN at review time.
- Cycle diff is only `.cdr/waves/prolog-memory-eval-v0/gamma-clarification-matrix.md`.
- No provider was invoked. No annotation dataset or method was changed.

## Terminal verdict

**REVISE**

The annotation fixture has reproducible structural checks and honors the
synthetic/private-data boundary, but it is not yet an adequate deterministic
oracle for the issue contracts or for the matrix output requested by #20.
The blocking gaps are category stratification, taxonomy completeness, and an
explicit v2/profile mapping. The matrix also leaves cell denominators and
some metric applicability/formulas implicit. This verdict is about structural
contract readiness only; it is not evidence about extractor or memory-model
quality.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | REVISE | The validator/scorer has exact structural failure codes and seeded errors, but the six Matrix A categories have no machine-readable category field or mapping. The requested category-stratified results therefore cannot be reproduced from the current JSONL alone. |
| Diagnostic oracles | REVISE | Private-marker and hash gates execute. The matrix says denominators are retained in raw output, but does not declare per-cell denominators/formulas or an applicability rule for Matrix B `Write P/R`; no deterministic scorer emits either matrix. |
| Reproduction from clean | PASS for annotation slice; REVISE for matrix/oracle readiness | `npm run test:cdr-annotation` passes and the direct validator reproduces the pinned 9-record SHA. Full `npm test` cannot run in this clean worktree because dependency `tau-prolog` is absent (`MODULE_NOT_FOUND`); this is recorded, not treated as research evidence. |
| Citation integrity | PASS, bounded | No external empirical claim is invoked. Issue #5, #20, project policy, gamma specification, and the pinned local files are the reviewed authorities. |
| Data-policy compliance | PASS | The manifest identifies synthetic authored data, intended use, redistribution boundary, and SHA-256; the validator rejects the tested private marker. No `data/memory.pl`, secret, or provider request was used. |
| Claim/evidence alignment | REVISE | Alpha and the matrix correctly disclaim live results and utility claims, but passing the structural tests cannot support future extraction precision/recall or matrix values until the missing category/mapping/denominator contracts are deterministic. |

## Reproduction record

Commands and exact results:

```text
git fetch --verbose origin main
=> origin/main=458d917798281e30cdab70df84dab1da8d877a68
git rev-parse origin/cycle/20
=> 760830177ab8a5bce6b271f0bd365cf6cf017dbb

npm run test:cdr-annotation
=> exit 0; cdr annotation ok

node cdr-annotation-harness.js .cdr/datasets/extraction-annotation-pilot-v1.jsonl
=> exit 0; {"status":"ok","record_count":9,"sha256":"7cf87a0f2a7b7f101872364c16d505e8c948825ac060fa2fe2bd5a8a004edf66"}

npm test
=> exit 1; Error: Cannot find module 'tau-prolog' (require stack includes prolog-engine.js)

git diff --check origin/main...HEAD
=> exit 0
```

Independent shape checks over the pinned annotation fixture returned:

```text
records 9
category_field_count 0
decision_counts { write: 4, ignore: 4, clarify: 1 }
predicates likes,lives_in,uses,works_at
unknown_vs_profile []
```

## Findings

### F1 — Matrix A category rows are not reproducible from the annotation oracle

Severity: blocking. Classification: oracle completeness / falsifiability.

Issue #20 and the matrix require six category rows and category-stratified
values (`gamma-clarification-matrix.md:15-33,55-59`). The annotation JSONL
records contain only `case_id`, `turn`, `decision`, and `assertions`; there is
no `category` field, category registry, or deterministic case-to-category
mapping. The annotation manifest lists coverage prose only
(`extraction-annotation-pilot-v1.manifest.md:8-11`). A future scorer cannot
reproduce the six row denominators or assign a case to exactly one row without
new unregistered policy. Add a pinned category field/registry and exact
membership/denominator rules before consuming this as the #20 oracle.

### F2 — Issue #5 taxonomy is incomplete for its own acceptance criteria

Severity: blocking. Classification: taxonomy completeness / claim-evidence alignment.

Issue #5 AC2 requires separate `scope`, `qualifier`, and date attribution, while
its proof plan also names qualifier and missing-qualifier cases. The gamma
contract's taxonomy contains `time` but no separate `scope` or `qualifier`
(`gamma-spec.md:31-41`), and the fixture has no explicit scope/qualifier
field. The interval is represented under `time`, which is reasonable only if
the issue contract is explicitly narrowed; otherwise distinct errors collapse
and cannot be diagnosed. Alpha/gamma must declare the mapping or add the
missing categories/fields and seeded negative cases without changing the
pre-registered thresholds.

### F3 — Annotation v1 has no declared compatibility mapping to v2/profile

Severity: blocking. Classification: wire-contract / implementation compatibility.

The active extractor contract is `memory-extraction-v2` with
`registry_identity`, `relation`, `valid_from`, `valid_to`, and `confidence`
(`schemas/memory-extraction.schema.json:4-8,40-104,171-174`); the active profile
identity is `prologos_agent_memory@1.0.0` and its conversation layer registers
the four fixture predicates. The annotation oracle instead validates
`predicate`, `modality`, `time`, and `source_span`, accepts any safe atom
predicate, and does not validate profile identity or profile arity
(`cdr-annotation-harness.js:35-43`). There is no pinned adapter or rule saying
how annotation `time`/`modality`/source spans map to v2 fields, or how unknown
predicates are rejected/candidate-routed. Structural validity of v1 therefore
does not establish that a v2 extractor output is comparable. Define and test a
deterministic mapping/profile gate; do not silently treat the formats as
interchangeable.

### F4 — Matrix denominators, formulas, and applicability are under-specified

Severity: blocking. Classification: metric contract / diagnostic oracle.

The matrix says cells contain exact-match or rate values and that denominator
and examples are retained in raw output (`gamma-clarification-matrix.md:17-19`),
but does not declare the denominator and formula for each column. In particular,
the scope of `Assertion exact match`, field-level columns, conflict accuracy,
provenance completeness, and Matrix B `Write P/R` for answering conditions is
not fixed. The method has some global scoring definitions, but #20 requires
the linked category/condition presentation and says not to hide indeterminate
denominators. Pin per-cell numerator/denominator, unit (turn/assertion/answer),
and `N/A`/indeterminate behavior before any model output is inspected. This
does not alter thresholds or baseline selection.

## Passing boundaries and limitations

- The positive/negative pizza counterexample and conjunction are present in the
  gold fixture; direct validator/scorer tests pass, including seeded taxonomy
  counts and private-marker rejection.
- The fixture is synthetic and the manifest SHA reproduces; no private local
  memory was consumed.
- The active profile contains all four fixture predicates, so the observed
  incompatibility is missing contract mapping/validation, not an unknown
  predicate in these nine gold records.
- `npm test` was attempted but blocked by the local missing dependency; no
  claim is made from that suite.
- No live model/provider, extraction precision/recall, baseline result,
  provenance rate, stale/contradictory error rate, utility, or threshold result
  is established.

## Required next action

Return F1–F4 to alpha/gamma for a bounded contract repair, then run a fresh
independent beta review. This beta does not edit the dataset or method, emit a
CDR receipt, merge, or close either issue.
