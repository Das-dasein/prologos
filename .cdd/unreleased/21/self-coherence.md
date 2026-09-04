## Gap

Issue #21, CDS design-and-build, bounded fake-provider pilot runner connecting
dialogue, extraction-v2, isolated Prolog evaluation, and normalized Matrix B.

## Skills

Loaded canonical CDS.md, generic cnos.cdd α pointer, issue #21, CDR policy and
method, live-extraction-harness.js, and cdr-matrix-harness.js.

## ACs

1. `npm run pilot -- --condition B1 --output FILE` runs all 12 cases.
2. `npm run test:pilot` proves byte-reproducible fake output.
3. Live mode is opt-in and requires a raw-output directory; usage and context
   budget are checked.
4. B1-B5 emit normalized records and Matrix B cells; B5 is labelled gold.
5. Focused tests cover malformed/incomplete output, leakage, trusted hash and
   immutability, unsafe query, and deterministic fake execution.
6. Output records source, dataset/config/profile/trusted hashes, condition,
   model, prompt hash, and per-turn provider usage.

## Self-check

The provider response, query, payload atoms, hashes, and trusted files are
validated at the boundary. Each case builds a fresh Prolog program; no trusted
file is appended. The fake provider is deterministic and its evidence boundary
is explicitly limited to harness determinism.

## Debt

The runner does not claim live utility or Prolog superiority. Matrix scoring
remains bounded to the registered pilot; independent CDR beta review is still
required. The tracked pilot config pins the current synthetic dataset and
trusted source hashes.

## CDD Trace

Steps 4-7: issue gap and constraints loaded; design/plan were not required for
this single bounded runner because existing extraction and matrix contracts
define the interfaces; focused tests were added before implementation; code is
`pilot-runner.js`, CLI is the `pilot` npm script, documentation is the README,
and this report records self-coherence and evidence. The unrelated shared
`cdr-tree-view.js` artifact is already present in commit `5a88a96`.
