# γ close-out: representation-live-evaluator-v1

## Scope closed

The repository now has a separately pinned collector for the approved
representation fixture. It validates sealed fixture/config bytes, performs
counterbalanced P0/P1 collection only after explicit opt-in, and retains raw
local evidence plus a non-CDR aggregate.

## Evidence

| Artifact | Evidence |
| --- | --- |
| α implementation | `c87ae82`, repaired by `ba7556a` |
| β R2 verdict | `beta-review-r2.md`: APPROVE |
| Astra verdict | `astra-final-audit.md`: APPROVE, bounded to method/code |
| Tests | focused evaluator, generator, offline no-call CLI, `npm test` |

## Boundary decision

The CDD live-evaluator method is accepted. Its next consumer is a fresh CDR
α live run that supplies explicit OpenAI API credentials/model and a new local
raw root. That run remains a separate research action; this close-out makes no
RFR-C1 effectiveness claim.

## Learning

Hashing bytes is not enough when an API accepts pre-parsed objects. The exact
object used for planning and collection must derive from the verified bytes.
The resulting regression test now blocks that substitution before any provider
side effect.
