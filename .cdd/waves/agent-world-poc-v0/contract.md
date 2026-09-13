# Agent world PoC v0 — implementation contract

Status: local PoC implemented and verified, 2026-09-10; see [receipt](receipt.md).
Authority: user request «работай над PoC»; design [agent-world-v0](../../designs/agent-world-v0.md).
No independent beta review or CDR benefit claim is implied.

The deliverable is a runnable, persistent single-agent episode, a CLI, a complete
replay report and regression evidence. Philosophical identity and learning values
remain the wider design; this PoC realizes memory-dependent choice and experience.

## Executable boundary

- A hash-linked append-only journal records source events, proposals, admission,
  goals, reflection, decisions and observed action outcomes. Reload reconstructs state.
- Source and status are independent. Admission has a named operator/policy and
  reason; thought/dream output cannot call admission.
- Accepted knowledge is native Prolog source plus lifecycle metadata. A shared
  as-of snapshot feeds thought and checking. Existing assertion and cognitive
  stores remain intact; explicit import adapters project their accepted material.
- Trusted profile `signed-horn-v0`: flat atoms/variables, declared predicate
  signatures, ground facts, range-restricted rules, conjunction, explicit `neg(P)`.
  Unsupported programs fail closed. Full Prolog thought remains separately available.
- Checker parses JSON and Prolog terms as data; never consults/calls source terms.
  Compute raw signed Horn closure, retaining source-backed derivations; then safe
  closure excluding every raw-conflicted ground literal and its opposite. Alongside
  the compact first-proof trace, retain all inclusion-minimal `item_id` support
  sets. A bounded support-set search fails closed on exhaustion; a shared item ID
  is provenance, not proof that two sources are independent. Each support set
  exposes combined, fact-only and rule-only event identities and declared source
  groups. The group defaults to the event identity, but an operator or import
  adapter can bind several events to one source group, making repeated
  transcription visible. Shared policy rules and shared factual origins remain
  separately auditable; no source reliability or real-world independence is
  inferred. The runtime exposes pairwise support comparison over these identity
  sets; its disjoint flags remain descriptive and do not alter action policy.
  This is a conservative two-closure policy, not classical explosion or an
  implementation of arbitrary nonmonotonic logic. Independent untainted paths survive
  unless their own conclusion is raw-conflicted. Both raw proofs remain inspectable.
- At time T, only admitted, asserted items already observed/admitted at T and valid
  at T support checking. A replacement becomes effective at the later of its
  admission and valid-from times; superseded items never silently reactivate.
- Branch assumptions are explicitly conditional, separate from admitted items and
  discarded after each run. A dream receipt may extend biography without changing
  the hash of accepted knowledge. Dream prefers a question whose two disposable
  branches change immediate action availability, but falls back to the ordinary
  safe missing-premise plan when no single branch does; it must not turn a
  multi-question plan into a premature pause. Incomplete execution never licenses
  action.
- Resource limits cover checker inferences, wall time, stack, output, and persistent
  episode query/branch/question budgets. A waiting episode does not ask repeatedly.

## Required demonstrations

1. H1/H2 have identical current goal/observations/actions/budget and different old
   rules. H1 asks about backup; H2 discards it and chooses release. Both signed
   branches are actually checked with old-rule provenance. No policy sees H labels.
2. Answer yes/no/unknown, record observation, reload and continue. A chosen release
   is a simulated action request; goal completion requires a separate observed outcome.
3. Rename IDs, remove old rule, change irrelevant history: choices follow semantics.
4. Direct and derived conflicts, alternative proof supports, expired/future/superseded
   items, unsupported code and exhausted budgets cannot yield falsely authorized action.
5. A simple missing-premise control runs on the same memory. Equal choices are
   reported as no demonstrated benefit of dreaming on these episodes.
6. Full-Prolog thought and optional LLM interpretation create reviewable proposals;
   their transcripts never become trusted proof or accepted memory automatically.

Report includes source events, complete programs, snapshots, goal/policy, branch
inputs/results/proofs, decisions, continuation and calibrated limitations.

## Deliberate bounds

One goal at a time; explicit commitments (`require_safe_proof`, question budget,
cost ordering); no automatic value induction or background wake. First-party
structured source events and yes/no interaction work offline. A model adapter may
formalize free text into an untrusted proposal, with explicit admission. No benchmark
claim follows from fixtures or one live model call.
