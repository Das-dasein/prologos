# Near-signature reflection v1 — Alpha preregistration

Status: `ALPHA PREREGISTERED — NO MODEL OUTPUT INSPECTED`.

## Question

For a frozen, model-authored finite-FOL candidate, does showing Luna the
read-only `near_signature_audit` portion of its own Prolog certificate improve
its ability to identify source-supported naming problems without falsely
calling distinct or technical names typos?

This tests diagnostic reflection only. It does **not** test final A/B/C answer
accuracy, automatic program repair, Prolog-memory benefit, or the primary CDR
claim.

## Frozen source and split

`fixture-v1.json` is model-visible and contains exactly 12 source worlds and
questions. It was generated from the pinned sanitized source excerpt file
`reports/luna-thirty-error-probes/source-excerpts.json`; its SHA is recorded
inside the fixture. Case 378 was excluded before writing the fixture because it
was used to develop and demonstrate the diagnostic.

`gold-v1.json` is evaluator-only: answer labels, target FOL, and sentence FOL
are never included in either model prompt. It is used only after both
conditions have completed.

## Procedure

1. In one fresh Luna call per case, produce one complete immutable labelled
   finite-FOL `program + query` from the visible source. Keep every returned
   candidate, including invalid ones; no selection after generation.
2. Execute each candidate in a fresh local Prolog process. Persist the exact
   standard certificate and enhanced certificate. Neither execution changes a
   candidate.
3. In two separate fresh Luna calls per candidate, ask for a source-grounded
   diagnostic report. Both prompts contain exactly the same source, question,
   frozen candidate, execution outcome, and standard certificate. The enhanced
   condition additionally contains only the `near_signature_audit` term.
4. The response schema permits `problems` (each with predicate names, cited
   `sN`, and a `same_relation`, `different_relation`, or `insufficient_basis`
   judgement) plus a free-text boundary explanation. It never permits a
   replacement program, alias, new fact, or final A/B/C answer.

The order of baseline/enhanced calls is counterbalanced by frozen case ID hash.
Each call uses `gpt-5.6-luna`, ephemeral fresh session, one turn, the same
reasoning effort/context window, and no tools. There are 12 generation calls
and 24 diagnostic calls. A failed call remains a recorded failure; there are
no retries or repair loops.

## Measures and falsifier

After both conditions, an evaluator compares claims to the source English and
evaluator-only FOL. Report per condition: source-supported naming problems
found, false typo allegations, source-citation completeness, and any other
material problem named. Case-level paired deltas are descriptive only.

The diagnostic does not support the intended claim if it fails to increase
source-supported findings, increases false typo allegations, or causes Luna to
claim an unsupported repair. A positive result is limited to this fixture,
prompt, model, and diagnostic task.

## Roles

Alpha prepares and runs. A fresh Beta session must verify fixture/hash,
prompt equality except for the disclosed audit, raw receipts, no-retry rule,
and scoring before Gamma may interpret results.
