# Gamma closeout: live-extraction-harness-v1

Issue: GitHub #17.
Gamma/Delta decision: merge-ready software evidence.

## Verdict

**CDD/CDS: GO.** The bounded harness contract is implemented, independently
reviewed through two repair rounds, and has a successful hosted deterministic
CI run on the final alpha implementation commit.

**CDR: no status change.** The harness enables a future opt-in extraction
pilot, but no real provider call, raw live result, annotation verdict,
precision/recall score, baseline comparison or product-utility claim exists.

## Evidence chain

| Stage | Evidence | Result |
|---|---|---|
| Gamma contract | issue #17; wave manifest/spec; gamma scaffold | bounded no-write harness selected |
| Alpha initial | `f32c065` through `5fc5f0e` | produced harness and deterministic evidence |
| Beta R1 | `3b094f5` | REQUEST CHANGES: CLI, prompt pin, live/raw boundary, CI |
| Gamma clarification R1 | `81eecec` | retained AC5 and defined repair |
| Alpha R1 | `046d223` | repaired CLI/pin/first adapter/CI attempt |
| Beta R2 | `8324a9e` | REQUEST CHANGES: evidence adapter and hosted CI still incomplete |
| Gamma clarification R2 | `4dd2318` | specified native usage/raw mapping and SWI prerequisite |
| Alpha R2 | `69e363871d0f3169adc9399df8966c48dcd127fd` | final repair |
| Beta R3 | `f9dbea75f3026333f97ce0f60f77db369ac7955d` | APPROVED |
| Hosted CI | GitHub Actions run 33924092275 | success on `69e3638` |

## Receipt

- v2 outputs validate against the active profile and produce local records;
  the harness never calls `MemoryStore` or writes trusted memory/registry.
- Private markers and registered stable-01 gold material reject before an
  adapter call. Provider selection is a fixed `fake`/`openai-api` allowlist.
- An OpenAI run is double opt-in and requires a local raw-output directory
  before adapter/client construction. Raw output is stored only as a local,
  non-overwriting file; normalized records retain a path reference only.
- Config and records pin dataset, profile, provider/model, prompt template and
  rendered prompt hash, sampling, retry policy and reconciled usage.
- Focused fake tests, full tests, CDR annotation/gold checks and hosted CI pass.

## Residual debt and boundary

- A real provider invocation remains an operator opt-in and has not occurred.
- CDR #5/#7 still own annotation adequacy, live-run admissibility, scoring,
  baseline parity and any research receipt.
- This closeout does not authorize a Lucid Dream runtime, candidate promotion,
  registry mutation, durable-memory write or model-generated executable code.

## Delta decision

Merge `cycle/17` into `main` with `Closes #17`. Preserve the above CDR
boundary in the pull-request body and issue closure. A tag/release is not
requested by this issue-level software merge.

## Learning

Early green unit tests did not cover the real CLI or hosted runtime. For future
provider-facing harnesses, require subprocess CLI tests, configuration pins,
raw-output isolation and a successful hosted run before the first beta review.
