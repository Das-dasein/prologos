# Beta review: PR #24 Prolog cognitive-memory reframe

Status: `REQUEST CHANGES`  
Role: fresh independent CDD beta  
Target: `6e58d817827722e0d5fbf2b2b4a85783a58ae685`  
Base: `origin/main` (`6edf8040a2f77fe57d5463a49d195c87db09f71f`)  
Issue: #23 — CDS: make Prolog an explainable cognitive memory layer
Date: 2026-09-06 (Europe/Samara)

## Scope result

The target contains the Prolog cognitive-memory design, the corrected issue
pack and the gamma preparation:

- `.cdd/designs/prolog-cognitive-memory-v1.md` defines the enduring Prolog
  model and proof-backed query loop;
- `.cdd/proposals/evaluator-v4-cdd-issue.md` is reframed as the issue #23
  design-and-build contract with AC1–AC7;
- `.cdd/proposals/cycle-23-gamma-preparation.md` selects the Prolog vertical
  slice and prepares fresh alpha/beta dispatch.

The three surfaces are consistent about the boundary: the agent authors a
restricted Prolog proposal program, parsing produces an internal AST, accepted
items run in an isolated Prolog session, and the agent-facing result is a proof
DAG or bounded missing-goal explanation. They also consistently prohibit
consulting untrusted proposals, silently activating hypotheses, and claiming a
CDR result.

## Reproduction evidence

Run from the target checkout:

```text
npm run test:offline-eval:v3   # exit 0: sentinels PASS
npm run test:offline-eval:schema # exit 0: schema and negative gate PASS
npm run test:pilot:preflight   # exit 0: live/raw gates, 0 provider calls
npm run test:pilot             # exit 0: runner gates PASS
npm test                        # exit 0: all project suites PASS
```

CI for PR #24 is green at review time:

```text
gh pr checks 24 --repo Das-dasein/prologos
test  pass  32s  run 33989058565 / job 101367864683
test  pass  36s  run 33989061266 / job 101367871559
```

## Blocking finding

The PR range contains tracked live/partial-output artifacts despite the
cycle-23 gate requiring them to be excluded:

```text
git diff --name-only origin/main...6e58d81 | rg '^reports/live-|/raw/|partial|live-' | wc -l
203
git ls-files reports | rg '/raw/|live-' | wc -l
198
```

The tracked directory is `reports/live-20260905-152059/` and includes raw
provider-shaped outputs. The gamma preparation only names the different,
untracked `reports/live-20260905-225936/` directory as excluded; it does not
remove the tracked `reports/live-20260905-152059/` inventory from the PR.
Therefore AC7 and the explicit no-live/partial-raw gate are not satisfied,
even though the executable regression and CI checks pass.

## Required changes

Remove the tracked `reports/live-20260905-152059/` artifacts from PR #24 (and
retain only an appropriate non-live manifest/metadata if separately justified),
then rerun the inventory gate and CI on the resulting immutable head. Do not
merge PR #24 until that exact target is independently re-reviewed.

Decision: `REQUEST CHANGES`; no merge and no CDR receipt.
