# CDR beta review — prolog-memory-eval-v0

## Review context

- Role: independent research beta, fresh session distinct from alpha.
- Doctrine: `usurobor/cnos@fb527e6c`, CDR loader, `CDR.md`, research-beta
  overlay, generic beta kernel, and `schemas/cdr/receipt.cue`, loaded in the
  required order.
- Project binding: `.cdr/POLICY.md` and this wave's `manifest.md`.
- Audited matter: only the alpha artifacts and source-snapshot refs named by
  the wave manifest.
- Candidate claim calibration: `hypothesized` method adequacy. No claim that
  PAM improves agent memory was reviewed or accepted.

## Verdict

**REVISE**

The method and pilot have useful bounded structure, and the dataset integrity,
registered taxonomy, active-state labels, and conflict-state labels reproduce.
The matter is not yet transmissible as an executable evaluation method: the
query-answer oracle contains reproducible failures and non-diagnostic labels,
the end-to-end answer oracle is incomplete, and the declared harness/configuration
needed to run the method is not pinned or present. These are correctable oracle,
method, manifest, and command gaps, which map to `REVISE` under the wave's
verdict map. `GO` and `BOUNDED-GO` both require a method executable as written;
that gate is not met.

## Field-2 oracle results

| Oracle | Result | Evidence |
|---|---|---|
| Falsifiability | REVISE | PAM-C1 through PAM-C3 have observable exact-set or operation metrics. PAM-C4 lacks complete per-case answer/provenance labels, so its stale-or-contradictory-answer claim is not yet mechanically falsifiable. |
| Diagnostic oracles | REVISE | Leakage and budget sentinels are described, but no executable harness or command implements their abort/reject behavior. Several fixed queries do not test the dialogue claim they are assigned to. |
| Reproduction from clean | REVISE | Clean-copy `npm test` passed, both dataset/source hashes reproduced, and exact active/conflict sets reproduced. The fixed-query reproduction exposed F1 below. There is no canonical command for the full symbolic, extraction, or end-to-end run. |
| Citation integrity | PASS | The method makes no external empirical-result claim. Its normative CDR source is pinned to `usurobor/cnos@fb527e6c`; alpha does not overstate the smoke test as evidence of memory usefulness. |
| Data-policy compliance | PASS | The 12 dialogues are synthetic and contain no prohibited private fields. `data/memory.pl` is excluded. The dataset manifest records origin, intended use, redistribution status, schema, taxonomy, and a reproducing SHA-256. |
| Claim/evidence alignment | PASS, bounded by REVISE | Alpha keeps method adequacy `hypothesized`, explicitly states that no live-model result exists, and does not claim that PAM works. The defects below prevent transmission of method adequacy, but they do not constitute an overclaimed positive architecture result. |

## Reproduction record

### Integrity and shape

- `shasum -a 256 .cdr/datasets/dialogues-pilot-v1.jsonl` returned
  `b5b394c60cbbb287ce4a8e15886e377e51437b4453a56e4e42c7ad31e21c6acc`,
  matching the dataset manifest.
- `shasum -a 256 -c .cdr/datasets/source-snapshot-2026-09-03.sha256`
  returned `OK` for all 15 listed source files.
- Independent JSON parsing found 12 records, 12 unique case IDs, and exactly
  two cases in each of the six registered categories.
- All 12 dataset records contain the declared active/conflict/query/provenance
  fields. The machine-readable oracle has the same 12-case key set for
  operations, active states, conflict states, and query answers.

### Clean-copy smoke reproduction

From a temporary clean copy containing the pinned source surface,
dependencies, and test fixtures, `npm test` completed with:

```text
ok
memory-store ok
codex-provider ok
```

This proves only the declared smoke behavior. Per project policy, it does not
prove that Prolog-backed memory improves final answers.

### Gold-injection reproduction

Beta independently converted every `write` gold operation into a fixed-ID
`claim/7` fact, asserted each declared `supersedes/2` edge, consulted the
pinned `memory.pl`, and ran the recorded queries using the pinned
`prolog-engine.js`:

- exact active-claim sets matched for 12/12 cases;
- exact unresolved-conflict sets matched for 12/12 cases;
- `stable-01` and `correction-01` did not produce their registered answers;
  Tau Prolog returned `existence_error(procedure,lives_in/2)`;
- `stable-02` returned the registered empty set, but its query tests Angular
  frontend knowledge rather than the dialogue's Python-use question;
- both temporal queries returned `true`, but only from literal date constants;
  neither query refers to an injected claim and therefore neither can diagnose
  temporal-memory correctness.

## Findings

### F1 — Query-answer gold oracle is partially invalid and partially non-diagnostic

Severity: blocking. Classification: oracle correctness / claim-evidence
alignment.

The method says every dialogue has one fixed query and that symbolic-core
correctness includes exact query answers
(`.cdr/methods/prolog-memory-evaluation-v1.md:9`, `:57-60`). The supplied
queries do not satisfy that contract:

- `stable-01` and `correction-01` call `lives_in/2`
  (`dialogues-pilot-v1.jsonl:1,3`), but the pinned program defines no such
  predicate; it stores `lives_in/2` only as a proposition inside `claim/7`
  (`memory.pl:31-33`). Reproduction returns an existence error, not the
  registered `City=samara` answer.
- `stable-02` asks which programming language the user uses, but the oracle
  calls `knows_frontend_framework(user)` (`dialogues-pilot-v1.jsonl:2`). The
  pinned rule tests only `knows_technology(Person, angular)`
  (`memory.pl:22-23`), so the empty result is unrelated to the Python recall
  question.
- `temporal-01` and `temporal-02` query `overlaps/4` using only literal date
  constants (`dialogues-pilot-v1.jsonl:5-6`). They succeed even if no dialogue
  claims are injected, so they cannot falsify the asserted temporal-memory
  behavior.

Because `pilot-oracle.json:10` repeats these expected answers, the separate
oracle artifact does not resolve the inconsistency. Alpha must revise the
affected queries and expected answers, then re-run exact beta-side
gold-injection reproduction. Beta does not prescribe or author the repaired
queries.

### F2 — The end-to-end answer oracle cannot score PAM-C4 as declared

Severity: blocking. Classification: incomplete labels / falsifiability.

The method declares stale-or-contradictory answer error and provenance
completeness as pre-registered metrics
(`prolog-memory-evaluation-v1.md:66-74`), and alpha says final-answer quality is
separate from those metrics (`alpha-report.md:22-25`). The pilot oracle only
records symbolic query bindings. It does not give a per-case acceptable-answer
contract, the required source/date evidence for every memory-backed answer, or
a deterministic rule for classifying a natural-language answer as stale,
contradictory, conflict-aware, or correct. Several memory-backed cases have an
empty `provenance` object (`dialogues-pilot-v1.jsonl:2,5-8`). Consequently,
PAM-C4 and the provenance=1.00 gate cannot be scored reproducibly from the
current labels.

### F3 — The method is not executable as written and the sentinels are assertions, not reproduced diagnostics

Severity: blocking. Classification: method conformance / diagnostic oracle.

The method requires a pinned model/provider, prompt, retry policy, context
budget, extraction run, answer conditions, a leakage abort, and a budget
rejection (`prolog-memory-evaluation-v1.md:40-53`). It supplies none of the
concrete values or a canonical command. No named alpha artifact contains the
harness that injects fixed IDs, persists `supersedes/2`, executes B1-B5,
measures token budgets, or makes either sentinel fail closed. Alpha itself
records that an additional separately pinned harness may be required
(`alpha-report.md:32-43`). The existing `npm test` smoke command does not run
the proposed evaluation.

This is not an acceptable `BOUNDED-GO`: the wave manifest requires even a
bounded-go method to be executable, while its `REVISE` definition explicitly
covers incomplete commands and harness sentinels.

### F4 — Baseline selection and comparability are under-pinned

Severity: blocking. Classification: comparative-method conformance.

The primary policy claim compares against the strongest non-Prolog baseline,
but the method does not pre-register how the strongest baseline is selected
from B1-B3. It also asserts that only the memory mechanism changes without
pinning the exact prompts, memory serialization/injection surfaces, truncation
rule, or effective-budget accounting that would make this check reproducible.
Those missing values leave both the strongest-baseline choice and the
budget-sentinel result open to post-result interpretation.

### F5 — Source-manifest repository-status statement is false in beta's copy

Severity: non-blocking alone; included in the `REVISE` set. Classification:
provenance/status truth.

The source manifest says the workspace is not a Git repository
(`source-snapshot-2026-09-03.manifest.md:12-15`). Beta observed
`git rev-parse --is-inside-work-tree` = `true`; `git log -1` reports that
`main` has no commits. The 15 SHA-256 pins still reproduce, so source-content
integrity is intact, but the provenance prose must distinguish "Git repository
with no commit snapshot" from "not a Git repository."

## Passing boundaries and limitations

- The six-case taxonomy and two-per-category coverage are correct.
- Dataset and source checksums reproduce.
- Proposal relations are within the pinned implementation allowlist.
- Gold active-state and conflict-state labels reproduce exactly when beta
  performs the method's declared direct injection and supersession assertions.
- Private exploratory `data/memory.pl` was not part of the audited dataset or
  reproduction input.
- The dataset is synthetic and too small for product-utility, novelty, or
  statistical-significance claims; alpha states these bounds honestly.
- No positive PAM result is transmissible from this wave. All PAM claims and
  method adequacy remain `hypothesized` pending alpha revision and a fresh
  independent beta review.

## Required next role action

Gamma should return F1-F5 to alpha as a bounded revision set. Alpha owns all
matter changes and any separately pinned CDS harness evidence. Beta must then
re-run the affected query, PAM-C4 label, sentinel, baseline, manifest, and
clean-copy checks. This beta session does not repair alpha matter and does not
close the wave.
