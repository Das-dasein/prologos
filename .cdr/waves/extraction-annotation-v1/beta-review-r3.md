# CDR beta review R3: extraction-annotation-v1 / issues #5 and #20

## Review identity and scope

- Role: independent CDR beta; fresh review pass after alpha changes. No alpha,
  gamma, delta, method, or dataset authorship.
- Branch: `cycle/20`; reviewed head:
  `8b315a2f1ad065911ffa1ade7ebfc177d74f6cd4` (matches `origin/cycle/20`).
- Review base refreshed synchronously: `origin/main=458d917798281e30cdab70df84dab1da8d877a68`.
- Authorities: GitHub issues #5 and #20, `.cdr/POLICY.md`, CDR contract and
  beta overlay, alpha repair report R1, gamma matrix clarifications, v1/v2
  schemas, active/profile registries, datasets/manifests, harnesses and tests.
- No provider/live-model call, private-memory access, method edit, dataset edit,
  merge, or issue closure.

## Terminal verdict

**REVISE**

The alpha changes repair the pinned matrix dataset hash and add deterministic
12-case/36-turn/six-category shape checks. The annotation fixture remains
synthetic and policy-compliant, and the existing structural tests pass. The
issue contracts are not yet closed, however: `scope` and `qualifier` remain
defaults rather than annotation dimensions; `toV2` does not enforce or emit
the v2 schema/profile identity envelope; and the matrix scorer reports only
gold shape counters, not the declared Matrix A/B cells with their applicability
and per-cell denominators. These are blocking oracle/claim-alignment gaps, not
evidence about extractor or memory quality.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | REVISE | The dataset SHA, case count, category registry, and six `2-record` category counts are executable. The annotation contract still has no machine-checked scope/qualifier values on records, and the matrix does not score the declared cells, so the issue-level quality claims are not yet falsifiable through the shipped outputs. |
| Diagnostic oracles | REVISE | `test:cdr-annotation`, `test:cdr-matrix`, and gold-injection tests pass; private-marker rejection and profile relation/arity checks run. No diagnostic checks v2 envelope identity/hash, scope/qualifier error cases, or Matrix A/B cell applicability and denominators. |
| Reproduction from clean | PASS for bounded structural slices; REVISE for the declared matrix oracle | Annotation, matrix, and gold-injection commands reproduce successfully from this checkout. Full `npm test` is environment-blocked because `node_modules`/`tau-prolog` is absent. Structural execution does not reproduce full extraction/memory metrics because those cells are not emitted. |
| Citation integrity | PASS, bounded | No external empirical result is invoked. Local issue, policy, schema, manifest, harness, and repair artifacts are the reviewed authorities. |
| Data-policy compliance | PASS | Dialogues and annotation fixtures declare synthetic/privacy-safe origin and hashes; private-marker rejection passes. No provider or `data/memory.pl` was used. |
| Claim/evidence alignment | REVISE | Alpha's report says F1-F4 are closed at contract level, but code evidence only establishes hash/category shape plus partial annotation and gold checks. It does not support the stronger claim that #5/#20 are executable end-to-end oracle contracts. |

## Reproduction record

```text
git fetch --verbose origin main cycle/20
=> origin/main=458d917798281e30cdab70df84dab1da8d877a68
git rev-parse origin/cycle/20 HEAD
=> 8b315a2f1ad065911ffa1ade7ebfc177d74f6cd4
git config user.name; git config user.email
=> beta; beta@prologos.cdd.cnos
npm run test:cdr-annotation
=> exit 0; cdr annotation ok
npm run test:cdr-matrix
=> exit 0; status=gold_contract_valid; 12 cases; 36 turns;
   six categories, 6 turns each; dataset SHA ed9dd7...
npm run test:cdr-gold
=> exit 0; status=ok; mode=gold-injection; source_commit=8b315a2...
npm test
=> exit 1; Cannot find module 'tau-prolog' (node_modules absent)
git diff --check origin/main...HEAD
=> exit 0
```

## Findings

### F1 — Scope and qualifier are not annotation dimensions

Severity: blocking. Classification: taxonomy completeness / claim-evidence
alignment.

`validateRecord` requires the exact assertion keys `id`, `predicate`,
`arguments`, `polarity`, `modality`, `time`, and `source_span`; it rejects any
`scope` or `qualifier` field. The contract only lists allowed values and
`toV2` unconditionally supplies `scope: "self"` and a time-derived qualifier.
Consequently a candidate cannot express or be scored for a scope error,
qualifier error, or missing qualifier required by issue #5 AC2. This silently
collapses distinct taxonomy dimensions into defaults/time. Alpha must add
explicit fields or a machine-checked derivation rule, plus positive/negative
fixtures and scorer coverage, without changing pre-registered thresholds.

### F2 — `toV2` does not enforce the v2 schema/profile identity contract

Severity: blocking. Classification: wire-contract / implementation
compatibility.

`toV2` checks relation membership and arity against the conversation profile
hash in the annotation contract, but returns only an assertion-shaped object.
It emits neither `schema_version: "memory-extraction-v2"` nor the required
`registry_identity` (`prologos_agent_memory@1.0.0` plus the v2 pinned SHA
`40558d46e4e73028cc19e5f97cdaf316833f74b916f76552f6443e8d5312e3a0`). It also
does not compare the active profile identity to that v2 registry identity.
The shipped test covers only unknown relation, not identity/hash drift or
envelope/schema validation. A v1 record can therefore pass the local adapter
while not being a valid v2 extraction document.

### F3 — Matrix scorer does not emit the declared Matrix A/B cells

Severity: blocking. Classification: metric contract / diagnostic oracle.

`cdr-matrix-harness.js` validates the pinned SHA, 12 records, 36 turns, and
exactly two records per category, then emits category counters
(`turns`, `write_turns`, `assertions`, `durable_turns`, `answerable_queries`).
Its `metrics` member is only a list of metric names; no numerators,
denominators, rates, `N/A` applicability, error taxonomy, or raw per-case
matches are calculated for Matrix A or Matrix B. The annotation scorer likewise
emits only category decision metrics. Thus the gamma definitions for field
accuracy, assertion exact match, write P/R, hallucination, false clarification,
active-state/conflict accuracy, provenance completeness, and stale/contradictory
error are prose, not reproducible executable outputs.

### F4 — Reported denominator counters are not yet the declared units

Severity: blocking. Classification: denominator integrity.

The gamma contract defines `A_k` as gold assertions and `W_k` as gold write
turns, while the matrix harness computes both `write_turns` and `assertions`
by counting `gold_operations` of kind `write`. This happens to coincide for
the current fixture (one proposal per write operation), but it is not a
machine-checked assertion count and cannot support future multi-assertion turns.
Likewise `durable_turns` is hard-coded to zero only for the ambiguity category
instead of derived from the declared `D_k` rule. Emit the declared unit,
numerator, denominator, and applicability per cell, or narrow the contract and
alpha claims explicitly before any model output is consumed.

## Passing boundaries and non-results

- The annotation SHA `7cf87a0f...` matches its manifest; the matrix SHA
  `ed9dd7f7...` matches its manifest and harness constant.
- Matrix shape is reproducible: 12 cases, 36 turns, six categories, two cases
  and six turns per category.
- Gold injection passes all 12 cases, but this is an oracle-ceiling check, not
  a live model or extraction-quality result.
- No precision/recall, baseline comparison, stale/contradictory error,
  provenance rate, utility, threshold, causal, or novelty claim is established.

## Required next action

Return F1-F4 to alpha/gamma for bounded contract repair and obtain a fresh
independent beta review. This beta does not edit method/dataset, invoke a
provider, merge, or close either issue.
