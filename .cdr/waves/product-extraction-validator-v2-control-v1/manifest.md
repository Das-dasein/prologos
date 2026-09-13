# Product extraction validator v2 control v1

Status before provider output: frozen fresh-control wave.

This wave was authored after the `extract-07` miss but before any model output
for these twelve cases. It probes whether the post-hoc pronoun gate catches
ambiguous writes without blocking clear single-antecedent or explicit-name
writes.

## Immutable inputs

- Source commit: `f9f1293b69d1c84862bd0bce421cdad4b6e618a0`, dirty research worktree disclosed.
- Fixture SHA-256: `5355d8b36420e95d17e571f4ff9e7bae0cf0fdca3cf0461823f7be594709496a`.
- Gold SHA-256: `55c9cd5e1342d3a239a1ad95a6d8ac48147050dc22293272243286a39c0a5317`.
- Collector snapshot SHA-256: `8eaa78ef9644f43881302250a25992b23b386dfdc77af42eabb4518970edb4d3`.
- Verifier snapshot SHA-256: `82f841faa45828f8e048fe52a74365a86819129b91e3f4dc29ce3a11246274ab`.
- Product validator source SHA-256: `01a34d1540f9a77e107601a2b59cceda4760401ccd2a0c9aa63234ec725d6b79`.
- Schema canonical SHA-256: `1b93c9c4889585c6dee5421c07e3907c2738ab734c472b6a5d07f301c79890a9`.
- Prompt contract SHA-256: `58a517c512603a652153053bdec96a8bdca44cc6c7fe833c67a42e3526ebffaf`.

The corresponding source snapshots are stored beside this manifest before
collection.

## Protocol

- Provider: Codex CLI `0.153.4`; model: `gpt-5.6-luna`.
- Twelve independent extraction calls; retry policy: none.
- Each prompt contains the v3 product contract and one source turn only.
- Gold is never placed in a provider prompt.
- Raw prompt, stdout and stderr are retained for every completed call.
- No repair calls, admission calls or Prolog writes are permitted.

Primary metrics: semantic assertion-set exactness, write/no-write boundary,
validator-v2 eligibility, harmful incorrect writes still eligible, correct
writes blocked, and clarify cases producing writes. Confidence and exact span
boundaries are not semantic scoring fields.

The control is authored and small; it tests these cases rather than estimating
real-world rates.

```sh
CODEX_MODEL=gpt-5.6-luna node product-extraction-v3-control.cjs \
  --fixture .cdr/waves/product-extraction-validator-v2-control-v1/fixture.jsonl \
  --gold .cdr/waves/product-extraction-validator-v2-control-v1/gold.jsonl \
  --model gpt-5.6-luna \
  --output-root reports/product-extraction-validator-v2-control-v1/luna \
  --allow-live-provider
```

## Observed outcome

All 12 calls completed with 36 raw artifacts and zero admission writes.
Validator v2 rejected both ambiguous pronoun writes, but it also rejected both
correct single-antecedent pronoun assertions. It is therefore a conservative
safety gate with demonstrated false rejection, not a validated coreference
resolver. Report SHA-256:
`716dab4ddae32beff78693d7c6ee6d7b75dba01273ec00889e890e7903123659`.
