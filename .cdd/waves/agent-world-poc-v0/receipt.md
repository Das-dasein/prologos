# Agent world PoC v0 — local implementation receipt

Date: 2026-09-10. Scope: user request «работай над PoC» and [contract](contract.md).
Outcome: runnable single-agent PoC completed locally. This is a self-audit and
engineering verification, not an independent beta verdict or a CDR claim.

## Delivered behavior

The agent records sources, proposals and explicit admissions, derives an as-of
signed Prolog memory snapshot, and chooses a question/action under a persistent
budget. It retains its identity and episode across actual CLI processes. A decision
to act waits for an observed simulation outcome; it is not dispatched again on step.

H1 asks whether backup is ready. H2 uses the old independent release rule and
discards the backup question. Both conditional branches execute. Neither dreaming
nor an untrusted full-Prolog transcript alters accepted knowledge. The simple
missing-premise control makes the same choices with one execution versus three,
so the normal agent mode uses that simpler policy.

Full-Prolog thought reuses the existing isolated runtime with the new optional
`forbidSubprocesses` policy enabled for world calls. Existing callers retain their
default behavior. The world checker never consults or calls input clauses.

## Requirement-to-evidence audit

| Contract requirement | Current evidence | Result |
|---|---|---|
| Persistent source/proposal/admission/decision history | `world/journal.js`; integrity and CLI-process tests | verified locally |
| Explicit admission, separate epistemic qualifiers | `world/agent.js`, `world/import.js`; admission, uncertain/time/import tests | verified within signed-Horn profile |
| Shared current snapshot for thought/checking; legacy input adapters | `world/journal.js`, `world/import.js`; both adapter tests retain archive/provenance and polarity | verified for documented import projections |
| Signed Horn checking, direct/derived conflicts, independent clean proof | `world/checker.pl`; direct conflict, derived conflict and multi-hop/cycle tests | verified on stated semantics |
| Time, supersession, no resurrection | as-of projection test | verified locally |
| Disposable assumptions and unchanged knowledge | H1/H2 tests; report/disk audit; all saved reflection receipts | verified |
| Budget, pause, unknown/no answer, interrupted run | budget/answer/recovery tests; reserved budget survives resume | verified |
| H1/H2 and causal interventions | both dream histories, renamed IDs including swapped H-labels, deleted rule and irrelevant-history tests | expected choices observed |
| Real restart and observed outcome | separate CLI process test; both report trajectories end completed | verified |
| Simpler control | report H1/H2-control, same first decisions, 1 vs 3 query executions | no dream benefit demonstrated here |
| Free thought cannot forge proof/admit knowledge | real sandbox thought test, forged transcript and denied subprocess attempt | verified on this macOS host |
| LLM input is a candidate | [live interpretation](live-interpretation.json): one real provider call, correct example clause, zero admitted items | adapter smoke only |
| Complete reproducible report | [report](../../../reports/agent-world-poc-final/index.html), full JSON, exact events/programs; [replay receipt](replay-result.json) | 11 logical runs replayed, four trajectories |

## Validation

- `npm test`: existing regression suite passed, then `posttest` ran all **17** world
  tests successfully. Output: [regression.log](regression.log).
- `npm run test:cognitive-memory`: existing real isolated thought/query tests passed.
  Output: [cognitive-memory.log](cognitive-memory.log).
- `npm run world:replay -- reports/agent-world-poc-final/report.json`: **11** saved
  logical runs and **5** reflection receipts verified across **4** trajectories.
- Report event arrays equal the actual disk journals; both main episodes are completed.
  A deliberately altered report was rejected. Conditional and thought snapshot hashes
  remain unchanged. Code hashes in the report match the current implementation.
- JavaScript syntax, changed Markdown links and `git diff --check` passed.
- Optional visual browser QA was unavailable: Browser Use rejected the local file URL.
  HTML structure and report content were checked; no screenshot/render-quality claim.

CI configuration runs `npm test` on Ubuntu with SWI installed. The portable world
tests are included through `posttest`; the real Seatbelt thought test is explicitly
skipped off macOS. This receipt records local results, not a remote CI run.

## Boundaries retained

The demonstration is synthetic, with hand-authored source/formalization pairs.
The live model call is one separate formalization example; it does not validate
general extraction quality. Accepted items mean admitted for use, not certified true.
The logical profile is conservative signed Horn; arbitrary Prolog remains an
untrusted thought facility. Imports are explicit documented projections, not a
migration of all older experiments. No CDR claims, thresholds or results changed.

One goal, explicit commitments and bounded question candidates constitute this
first scene. Value induction, long-lived identity branches, changing shared Ideas
and open-ended autonomous exploration remain the wider philosophical project.
No remote publication, GitHub messaging or upstream hub changes were performed.
