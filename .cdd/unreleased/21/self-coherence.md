## Gap

Issue #21, CDS design-and-build repair R2. The shipped runner labelled B1-B4
without distinct memory paths or final answer calls; this cycle implements the
prospective `prolog-memory-evaluation-v2` software contract and keeps live
model quality outside the evidence boundary.

## Skills

Loaded CDS/CDS.md, CDD issue/contract/proof/constraints/design/plan, CDR
SKILL.md/CDR.md, and engineering code/test guidance from the current
activation tree. The issue-requested
`cnos.cds/skills/cds/implementation` surface is absent in this authority
snapshot; existing code/test guidance was used instead. Affected peers are
`pilot-runner.js`, `test-pilot-runner.js`, `cdr-matrix-harness.js`, the pinned
pilot config, and this self-coherence artifact; prospective CDR method,
handoff, repair report, dataset, oracle, trusted files, dashboard, and
historical `.cdd/unreleased/21` artifacts were treated as read-only.

## ACs

1. Distinct paths: `test-pilot-runner.js` asserts `recent_turns`,
`rolling_summary`, `typed_claims_no_prolog`, and `typed_claims_plus_prolog`
contexts, unequal hashes, 0 B3 Prolog calls, and 12 B4 calls.
2. Final answers: the focused test instruments 36 extraction and 12 answer
calls per B1-B4 and checks answer usage, raw refs, and answer records.
3. Budget E: every condition has 72 measured extraction/summary/answer
entries, all equal configured E=8192; an unequal-E fixture fails closed.
4. v2 evidence: condition artifacts and aggregate retain v2 identity, hashes,
config, prompts, raw refs, usage, contexts, claims, turns, and intervals;
`scoreCandidateArtifact` consumes the aggregate and rejects incomplete shape.
5. Scoring: records carry separate extraction and answer cells with explicit
numerators/denominators; aggregate baseline remains `null` until a complete
comparative run, while fake answers exercise the registered 12-case fixture.
6. Safety/compatibility: focused tests cover leakage, missing raw output,
trusted hash mismatch, unsafe query, and missing answer adapter; `npm test`,
CDR gold, annotation, matrix, and focused pilot gates pass. B5 remains
`gold_oracle`.

The fake fixtures prove software behavior and reproducibility only; they do
not prove live answer quality or PAM-C1--C4.

## Self-check

The implementation keeps extraction, context construction, Prolog, and answer
effects explicit. Runtime claim IDs keep gold IDs out of model prompts while
source claim IDs remain in records and fake provenance. All required claims in
this report map to focused commands or code surfaces; no live provider or
comparative pilot was run. No ambiguity is deferred to beta about v1/v2
identity, B5 boundary, or the configured E gate.

## Debt

Fake execution remains software evidence only. Live PAM-C1--C4 quality,
thresholds, baseline selection, utility, causality, superiority, and
statistical significance remain for a separately authorized run and fresh
independent CDR beta. The requested CDS implementation skill is absent from
the supplied activation snapshot. Aggregate currently records a null baseline
until all live B1-B3 scores are available; no historical artifact was
rewritten.
