# CDR beta dispatch R2: prolog-memory-eval-v0

Project: `prolog-agent-memory`.
Working directory: `/Users/artem/Documents/code/prolog-agent-memory`.
Wave: `.cdr/waves/prolog-memory-eval-v0/manifest.md`.
Policy: `.cdr/POLICY.md`.
Prior verdict: `REVISE` in `beta-review-r1.md`.

## Independence requirement

Run this dispatch in a fresh independent CDR beta session. The current Sigma
session prepared the engineering evidence and must not author the beta verdict,
receipt, or a repair to its own evidence. Beta must not edit alpha/CDS matter.

Load, in order:

1. `cnos.cdr/skills/cdr/SKILL.md`;
2. `cnos.cdr/skills/cdr/CDR.md`;
3. the CDR beta role overlay at the pinned CNOS revision;
4. the typed receipt schema `schemas/cdr/receipt.cue`.

## Evidence under review

- Harness source commit: `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`.
- Harness input pinning commit: `ea4e725889ebfaf571ba0df2ac4d897b5fc0a2ce`.
- Raw B5 result: `.cdr/results/prolog-memory-eval-v0/gold-run-v1.json`.
- Pinned config: `.cdr/results/prolog-memory-eval-v0/eval-config-v1.json`.
- Current source snapshot: `.cdr/datasets/source-snapshot-f8796ab.manifest.md` and
  `.cdr/datasets/source-snapshot-f8796ab.sha256`.
- Historical R1 snapshot: `.cdr/datasets/source-snapshot-2026-09-03.*`; do not
  rewrite it.

## Reproduction commands

From the pinned harness commit or an equivalent clean archive:

```sh
shasum -a 256 -c .cdr/datasets/source-snapshot-f8796ab.sha256
npm test
npm run test:cdr-gold
node cdr-eval-harness.js \
  --config .cdr/results/prolog-memory-eval-v0/eval-config-v1.json \
  --dataset .cdr/datasets/dialogues-pilot-v1.jsonl \
  --oracle .cdr/results/prolog-memory-eval-v0/pilot-oracle.json \
  --source-commit ea4e725889ebfaf571ba0df2ac4d897b5fc0a2ce
```

Compare the final command's output byte-for-byte with
`.cdr/results/prolog-memory-eval-v0/gold-run-v1.json`. Record the command,
environment, output-match boolean, and all non-zero or timeout behavior in the
beta review. Do not trust an answer after a failed preflight.

## Required review oracles

- **Falsifiability:** distinguish the symbolic B5 claim from any live-model
  extraction or answer claim.
- **Diagnostic oracles:** verify pinned SHA checks, fixed query registry,
  unsafe-query rejection, config rejection, and duplicate-case rejection.
- **Reproduction-from-clean:** reproduce the output without the working tree's
  `.git` directory, using the explicit source SHA override.
- **Data policy:** verify the private `data/memory.pl` exclusion and the new
  source snapshot boundary.
- **Claim/evidence alignment:** ensure the evidence is reported only as
  deterministic gold injection; do not treat it as model utility, extraction
  quality, or a live baseline comparison.
- **Remaining limitation:** decide whether absent live-model execution keeps
  the wave at `REVISE` or permits a bounded decision under the registered
  method. The beta must state the reason and not silently weaken thresholds.

## Expected beta output

Create a new append-only review artifact, for example
`.cdr/waves/prolog-memory-eval-v0/beta-review-r2.md`, containing:

- independent session/identity and reviewed commit;
- verdict: `GO`, `BOUNDED-GO`, `REVISE`, `NO-GO`, or `INDETERMINATE`;
- result for every required oracle;
- clean-copy reproduction record;
- explicit treatment of the live-model sentinel gap;
- findings addressed to alpha/CDS, without editing their matter.

No CDR receipt is authorized by this dispatch alone. Gamma must close only after
the typed receipt validates and delta makes the boundary decision.
