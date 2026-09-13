# Provenance policy ablation v2

## Question

Which authored recorded-provenance condition is rejected as the deterministic
action gate advances from safe proof to group disjointness, host attestation and
lineage disjointness?

## Correction from v1

V1 encoded the conflict control as both `raw_status=conflict` and
`safe_status=conflict`, although the real checker returns `raw_status=conflict`
and `safe_status=unknown`. Its standalone runner also inspected safe status
before the raw conflict, unlike `WorldAgent.step()`. V2 corrects both fields and
decision ordering. A focused test obtains the same shape from the real checker
and requires every active policy to pause.

The retained v1 files remain historical evidence of the flawed synthetic
contract. They are not used for the current verification command.

## Frozen design

The fixture contains 11 synthetic checker-shaped results. Four policies with a
threshold of two evaluate each result:

1. `safe`: act on safe entailment;
2. `group_v1`: require disjoint fact source groups;
3. `attested_v2`: additionally require host-attested fact groups;
4. `lineage_v3`: additionally require distinct recorded source lineages.

The authored matrix covers independent lineages, recorded copying, untrusted
group multiplication, mixed trust, duplicate items, missing lineage, one
support path, unknown, conflict and contradiction. No model or network call is
made.

## Claim boundary

Exact replay establishes conformance to this finite policy contract. The one
live-checker regression establishes only the shape and ordering of the conflict
control. This experiment does not establish source truth, hidden-copy
detection, source independence, policy utility or full end-to-end equivalence
for all 11 cases.

