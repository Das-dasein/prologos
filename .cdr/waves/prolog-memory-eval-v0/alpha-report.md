# Alpha report — prolog-memory-eval-v0

## Research matter

This α session produced a pre-registered method, a synthetic 12-dialogue
dataset, its manifest, and a machine-readable pilot oracle. No model result or
claim that PAM works is made; method adequacy remains `hypothesized`.

## PAM mapping

- PAM-C1 (deterministic symbolic layer): gold operations and exact oracle
  comparisons isolate active-state, temporal-overlap, direct-conflict, and
  provenance behavior from language extraction. The correction cases require
  explicit supersession; temporal cases require retaining non-overlapping
  history.
- PAM-C2 (dialogue-to-claim formalization): operation-level write precision and
  recall are scored separately from proposal-field accuracy. Non-memory and
  ambiguity cases test abstention/clarification rather than forced writes.
- PAM-C3 (active/conflict reasoning): B3 and B4 share typed claims and budget;
  only deterministic Prolog rules differ. Conflict tuples and stale-state use
  are explicit oracle targets.
- PAM-C4 (final answers): B1–B4 use the same answering model and effective
  context budget. Stale/contradictory error, false clarification, answer
  quality, and provenance completeness are separate measures; B5 is an oracle
  ceiling.

## Diagnostics and limits

The stable-01 leakage sentinel rejects gold-ID exposure. The budget sentinel
rejects unequal effective context. The manifest hash enables clean-copy
reproduction. The pilot is synthetic and too small for significance claims;
gold operations simplify pragmatics; and the current prototype needs a
harness-level `supersedes/2` assertion because MemoryStore does not persist
that operation. These are named limitations, not silently treated as results.

## Alpha self-check

All required files are present, every category occurs exactly twice, and every
case has complete operations plus active/conflict/query/provenance oracle
fields. No private `data/memory.pl` content was read or copied. The unresolved
question is whether the current runtime can execute the supersession oracle
without an additional, separately pinned harness; that is a bounded execution
limitation for β to reproduce, not a positive architecture claim.

## Historical mapping correction

The claim labels in the preceding historical production record predate the
canonical ledger mapping and are retained verbatim as provenance. They must
not be used as the current PAM mapping. The authoritative meanings and
statuses are in `.cdr/claims/open-claims.md` and the R2 repair report:
PAM-C1 is the comparative Prolog usefulness claim, PAM-C2 is symbolic
correctness from gold claims, PAM-C3 is extraction-error attribution, and
PAM-C4 is explicit-correction repair-loop behavior. This append-only note
records the correction without rewriting the historical research artifact.
