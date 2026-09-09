# Beta report — semantic branch dream v2.1

Verdict: `GO` for the narrow descriptive result below. Review scope was
`main` commit `0e72135` plus local raw `raw-luna-v3-20260909/`. Beta made no
edits and no model calls.

## Provenance and blinding

- The v2.1 preregistration commit is `726477f`, recorded at 10:28:33 UTC;
  raw-v3 provenance starts at 10:28:43 UTC.
- `sample-v2.1.json` SHA-256 is
  `a27dc3f5bc5c2cd89bc483120b2a3e27b1b5e23c0bfdfbe107433d5c00cd9508`.
  Both output-schema hashes match the manifest.
- Raw v1 contains eight app-server initialization failures with empty stdout:
  no model exposure. Raw v2 contains one model response for c01; v2.1 excludes
  it and replaces it with c09.
- All 24 v2.1 prompts exactly match the preregistered runner. The hidden
  `expected_class` field is absent from every model prompt.
- For every case, plain and declared conditions cite the same baseline hash.
  The declared condition adds only its assessment field and consistency
  instruction; it does not receive an extra model call.

## Raw and execution checks

- 24 complete model receipts and 120 JSONL events were inspected. Every call
  has one completed turn; no forbidden tool action was observed. Stored prompt,
  stdout, stderr, and output hashes match their raw files.
- The schemas admit at most one `connector_interpretation`; alias and type
  branches are unavailable. Every actual accepted branch changes one OR/XOR
  connector in s2 and keeps the query.
- Beta independently re-executed every condition trace: 24 isolated candidate
  executions, zero model calls. All 16 condition conclusions match alpha raw
  and the saved fail-closed replay.
- A deliberately malformed program was independently rejected as `failed` /
  `unresolved`; bindings after a load error do not become a successful trace.
- The HTML dashboard matches regeneration from the checked alpha report and
  raw files byte-for-byte.

## Calibrated result

On these eight frozen simple texts, both conditions proposed a permitted OR/XOR
branch for all four bare `either-or` cases and abstained for all four explicit
controls. The declared condition's eight labels match the frozen independent
classes. The two conditions have identical observed decisions on this sample;
no advantage of the extra declaration was observed.

This does not establish general language disambiguation, answer accuracy,
memory benefit, Prolog benefit, or a causal improvement over v1. The
instruction itself explains the intended readings, and the eight authored
templates share a very simple structure.
