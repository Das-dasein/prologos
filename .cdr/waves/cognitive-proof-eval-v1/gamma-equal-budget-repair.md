# Gamma repair: equal-context P0/P1 contract

Issue: https://github.com/Das-dasein/prologos/issues/29  
Branch: `cdr/29`  
Mode: prospective offline CDR repair.

## Finding

The method says P1 is P0 plus a trusted proof and simultaneously requires
exact measured equal effective context budget `E`. Literal appending makes P1
longer. A configuration label or a shared maximum is not the policy's
per-request equality evidence. The earlier offline GO therefore remains valid
only for symbolic fixture adequacy, not for a ready live comparison.

## Repair decision

Pre-register one **fixed evidence slot** per case before any model output:

- P0 contains the accepted-snapshot serialization, query, and a control slot
  filled with a deterministic semantically inert marker sequence of that
  case's declared slot size.
- P1 has byte-identical material except the same slot contains the trusted
  proof/missing-goal serialization followed by deterministic padding to the
  declared slot size.
- If a proof cannot fit in the declared slot, the case is `unavailable`; it is
  not silently truncated, and cannot enter P0/P1 scoring.
- PX uses the same P1 slot plus separately labelled transcript capacity, is
  exploratory, and cannot select the primary baseline.

The future harness must measure tokenization with the pinned provider/model
tokenizer or provider-reported input usage. Its recorded equality digest covers
snapshot/query/model/prompt/sampling/slot-size and measured `E`; P0/P1 are
rejected on any mismatch. The control marker itself contains no oracle labels,
answer contract, category or expected result.

## Alpha deliverables

1. Amend method/manifest with the slot grammar, fit/failure rule, padding
   derivation, prompt-leak rule and equality digest fields.
2. Add deterministic offline fixtures/validator that assemble P0/P1 for all
   12 cases, prove equal byte budget at the declared tokenizer abstraction,
   prove P1 differs only inside its reserved slot, rejects overlong proof and
   rejects control-marker/oracle leakage.
3. Update status/alpha report without a provider call, receipt or claim.

## Beta oracle

Fresh beta recomputes all dataset/oracle hashes and slot artifacts; attempts
overlong proof, unequal slot, hidden oracle content in control text and P1
outside-slot mutation; verifies the old live/effectiveness boundaries remain
absent. A GO is method-repair-only and unblocks CDS #28; it is never PAM-C1.

## Constraints

- no provider/model/API call, raw live output or model-token assertion;
- no post-output choice of slot size, padding, E or baseline;
- no threshold/claim alteration or historical v0 change;
- no code harness implementation for issue #28 in this CDR repair.
