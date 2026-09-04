# CDD/CDS wave: live-extraction-harness-v1

Issue: GitHub #17.
Base: `04a08184ddbba32862068f9f1d03d2f0c80b71a4`.
Consumers: CDR issues #5 and #7.

## Objective

Produce a provider-independent, reproducible harness for turn-level
`memory-extraction-v2`. It must make a later live extraction pilot auditable
without writing trusted memory, changing CDR evidence, or treating a provider
response as a research result.

## Boundary

- CDD/CDS owns harness code, deterministic fixtures, config schema and local
  result shape.
- CDR owns annotation adequacy, dataset/oracle interpretation, thresholds,
  observed results and the receipt.
- A real provider invocation is opt-in and local. It is not part of the test
  suite and cannot be reported as CDR evidence until a fresh CDR beta
  reproduction reviews the immutable harness commit and raw run artifacts.

## Definition of done

- a v2 envelope is validated against the active profile and recorded without
  invoking `MemoryStore.add` or modifying `.pl`/registry files;
- each run pins source commit, dataset hash, registry identity, provider/model,
  prompt hash, sampling, retry policy and context-usage evidence;
- private-data markers, `stable-01` gold ID/proposal leakage, stale identity,
  malformed output, missing usage and incompatible budget fail before scoring;
- fake-provider tests make successful and failed normalized records
  reproducible;
- alpha evidence, a fresh independent beta review and gamma receipt are
  committed before issue closure.

## Non-goals

- live-model quality or product-utility claim;
- CDR dataset/oracle/threshold edits;
- durable memory writes, candidate promotion or executable model-authored code;
- answer-baseline comparison, UI, reflection or Lisp implementation.
