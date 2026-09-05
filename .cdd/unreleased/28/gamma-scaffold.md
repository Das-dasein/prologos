# Gamma scaffold: cycle 28 — trusted-proof live-run preflight harness

Issue: GitHub #28, `CDS: build trusted-proof P0/P1 live-run preflight harness`.  
Branch: `cycle/28`.  
Base: `8ed0ebafa424d06e576aa0579ec6866e58382898`.

## Selected gap

CDR `cognitive-proof-eval-v1` now has a fresh-beta-approved synthetic oracle
and immutable equal-slot registration. It is still not executable as a later
human-operated P0/P1 answer run: there is no deterministic prompt builder,
oracle-leak guard, raw/usage envelope, equal-`E` gate or answer/provenance
scoring boundary for this architecture.

This cycle builds that **preflight/harness only**. It does not call a provider,
inspect model output, issue a CDR receipt or claim that proof improves answers.

## Binding inputs

- `.cdr/waves/cognitive-proof-eval-v1/{method.md,dataset.json,manifest.md,
  slot-registration-v1.json}`;
- `.cdd/designs/prolog-cognitive-memory-v1.md` and `runTrustedQuery`;
- CDR policy and equal-budget repair closeout.

The CDR slot map is immutable input. Do not rewrite its dataset, oracle labels,
thresholds, or method to fit harness behavior.

## Required surfaces

- an explicit P0/P1/PX context/prompt assembler using the registered slots;
- a trusted-proof call only for P1, with P0 built from the same accepted
  snapshot/query and neutral control slot;
- equality digest over source/dataset/slot registration/snapshot/query/model/
  prompt/sampling and measured effective budget `E`;
- pre-call leakage sentinel rejecting oracle-only fields and other forbidden
  material; P1 proof itself is allowed only in its declared evidence slot;
- injected fake provider/token-counter fixtures and an opt-in live adapter
  boundary; no test or default CLI path may reach a provider;
- raw/usage/result record format, non-overwriting local artifact writer and
  answer/provenance scorer based on hidden contracts;
- focused tests and `self-coherence.md`.

## Acceptance oracle

| AC | Required evidence |
|---|---|
| P0/P1 construction | exact same accepted snapshot/query/outside-slot material; P1 contains trusted result, P0 neutral control; registered slot hash matches |
| P1-only proof | P0 never calls `runTrustedQuery`; P1 does exactly once per case; PX transcript remains labelled untrusted/exploratory |
| Leak safety | hidden answer, expected result/hash, category and registration/oracle content reject before injected provider call |
| Budget | fake measured input/output/total usage records per request; unequal P0/P1 E rejects aggregate before scoring; actual live provider contract requires measured—not config—E |
| Raw/provenance | each answer envelope keeps prompt hashes, usage, raw ref, snapshot/query/proof refs and scorer outcome; no overwrite |
| Live gate | default/fake path has no network; live adapter can only be reached after explicit provider + `--allow-live-provider` + complete immutable config, but alpha never invokes it |
| Regression | focused suite, project suite and diff check pass |

## Explicit constraints

- No provider/model/API call, key, raw live output, retry or actual answer
  comparison during alpha/beta.
- Do not treat offline UTF-8 byte equality as a provider/model token result.
  Live execution must record provider/token-counter measurement and fail when
  P0/P1 differ; a config label is insufficient.
- Do not use untrusted thought transcript as trusted proof, score PX as a
  primary baseline, or silently truncate an overlong proof.
- No CDR receipt/PAM claim, threshold/dataset/oracle mutation, merge or issue
  closure by alpha.

## Alpha dispatch

```text
Role: fresh CDD alpha for issue #28 on cycle/28.

Read all binding inputs, this scaffold and relevant CDD alpha/project skills.
Implement only the no-live preflight/harness vertical slice. Keep default
execution fake/offline, make live capability explicit opt-in but do not call
it, and preserve all CDR boundaries. Maintain canonical self-coherence, run
focused/full/diff checks, commit/push alpha-only work and return immutable
evidence/debt. Do not author beta/gamma verdicts or merge.
```

## Beta dispatch

```text
Role: fresh independent CDD beta for issue #28 on cycle/28.
Review exact alpha target against CDR inputs and this scaffold. Reproduce
P0/P1 construction, P1-only trusted query, slot-map binding, leak-before-call,
unequal-E rejection, raw/provenance/non-overwrite and live opt-in gates using
fake provider only; verify no live call/claim entered. Return GO only for
harness behavior, otherwise reproducible RC. Do not emit a CDR receipt.
```
