# Gamma scaffold: cycle 17

Issue: GitHub #17, `CDS: add reproducible live-extraction harness for CDR
extraction-v1`.
Branch: `cycle/17`.
Base: `04a08184ddbba32862068f9f1d03d2f0c80b71a4`.
Mode: substantial CDS implementation cell, consumed later by separate CDR work.

## Selected gap

The current repository reproduces the deterministic gold-injection B5
condition, but cannot execute or audit `memory-extraction-v2` against a
pinned provider/model/prompt. This leaves CDR extraction evidence at REVISE:
schema and gold tests do not prove model formalization quality.

The selected intervention is the smallest software slice that can make a
later experiment admissible: a provider-independent, no-write extraction
harness with deterministic fake-provider evidence and live-run preflight.
It does not run the experiment or change the CDR method.

## Expected surfaces

- current v2 extraction schema, providers and active ontology registry;
- a new harness/config/result-record surface and deterministic fake fixtures;
- focused tests plus existing regression commands;
- `.cdd/unreleased/17/self-coherence.md` and alpha-owned wave evidence.

Peer set to enumerate before closure: both provider adapters; all current
extraction-envelope producers/consumers; checked-in schema generation;
CDR dataset/config/result writers; tests/fixtures that can emit provider data.
Any exempt peer requires a reason in alpha self-coherence.

## Acceptance-oracle approach

| AC | Oracle |
|---|---|
| v2 validation/no write | fake current-profile envelope plus trusted-file byte identity |
| leakage/privacy preflight | injected `stable-01` gold or private marker rejects before adapter call |
| output/identity boundary | stale or malformed fixture rejects structurally |
| context accounting | missing usage and budget-breach fixtures reject; no synthetic token count |
| reproducibility | repeated fake run yields byte-stable normalized record and pinned metadata |
| regression | focused tests, `npm test`, and existing CDR deterministic commands |

## Implementation contract

| Axis | Binding |
|---|---|
| Language | Existing CommonJS JavaScript / Node runtime |
| CLI target | New explicit local harness command; no test-time live network invocation |
| Package scope | Existing project modules; no new external service or package without contract amendment |
| Existing binary | Preserve current chat/provider behavior; harness is an additive no-write path |
| Runtime dependencies | Existing provider abstractions and test dependencies; API credentials remain local-only |
| JSON contract | `memory-extraction-v2` and active profile identity remain authoritative |
| Compatibility | Do not revive a hard-coded relation list or modify CDR data/oracles/thresholds |

## Active skills for alpha

Load, in order, before code: CDD loader, `CDD.md`, CDD alpha role, CDS loader,
`CDS.md`, CDD issue/design/plan, then `eng/code`, `eng/test`,
`eng/typescript`, and `eng/ux-cli`. The exact source paths are named in the
alpha dispatch message. Alpha does not load beta or gamma role skills.

## Explicit constraints

- No live provider invocation, API key, raw live output, CDR claim, CDR
  threshold/dataset/oracle change, memory write, registry mutation, candidate
  promotion, reflection or Lisp scope.
- Alpha configures the local role identity before commits as
  `alpha@prologos.cdd.cnos`.
- Alpha writes canonical self-coherence incrementally with bare headers:
  `## Gap`, `## Skills`, `## ACs`, `## Self-check`, `## Debt`, and
  `## CDD Trace`.
- Review-readiness is forbidden until the pre-review gate in the loaded alpha
  contract passes and this scaffold is cited as the gamma artifact of record.
