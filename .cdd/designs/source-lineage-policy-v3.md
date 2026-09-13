# Source-lineage decision policy v3

## Motivation

Two publishers, URLs or messages are not necessarily two independent origins.
They may repeat the same press release, wire report, database record or person.
Source-group assurance v2 prevents a model from inventing trusted group labels,
but group disjointness alone cannot represent this dependency.

## Recorded contract

A host may attach `source-group-attestation-v2` to a source event:

```json
{
  "by": "connector/example-v1",
  "reason": "Authenticated publisher and upstream lineage from connector metadata",
  "lineage_id": "wire-report/abc-123",
  "external_receipt_sha256": "<optional 64-hex content hash>"
}
```

`lineage_id` is the host's stable identifier for the earliest common origin it
can establish. Different source groups may deliberately share one lineage. The
journal hash-chain binds the normalized v2 receipt to every item derived from
that source event. Items cannot replace the group, assurance, receipt or
lineage.

## Decision rule

`independent-host-attested-lineage-support-v3` applies three gates in order:

1. the signed-Horn query must be safely entailed and not raw-conflicted;
2. every fact-source group in a candidate proof path must be exclusively
   `host_attested` and have exactly one recorded lineage;
3. the selected proof paths must have pairwise disjoint lineage sets.

The implementation sorts paths canonically and returns the first qualifying
combination. A threshold of two therefore rejects two publisher groups derived
from the same upstream report, while permitting two groups with distinct
lineages. Missing or conflicting lineage metadata causes a pause; it is never
treated as evidence of independence.

Hermes selects v3 from the host-owned
`decision_min_independent_fact_support_paths` setting. Its model-facing tool
schema contains no policy field, and the provider overwrites any injected
policy value before calling the local bridge.

## Evidence and limits

Deterministic tests cover common-lineage rejection, distinct-lineage action,
missing-lineage rejection, item-level override rejection and forged checker
metadata. The earlier 24-case provenance oracle remains a v1 replay and is not
relabelled as lineage evidence.

Lineage remains an attested host classification. This policy cannot discover
undocumented copying, collusion or false connector metadata. Authentication and
lineage extraction belong in connector-specific adapters; the core preserves
and enforces their receipts without pretending to infer them.
