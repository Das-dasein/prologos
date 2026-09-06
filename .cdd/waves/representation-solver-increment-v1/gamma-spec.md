# CDD γ specification: representation-solver-increment-v1

## Purpose

Extend the sealed 24-world representation experiment to its prespecified P2
condition. The resulting live collection has 72 records: the existing paired
P0/P1 calls plus one P2 call for each same case. P2 estimates the increment
from a real logical engine; it must not turn engine output into P0 or P1
input.

## Condition contract

| Condition | World material | Callable engine surface |
| --- | --- | --- |
| P0 | existing natural-language rendering | none |
| P1 | existing Prolog rendering | none |
| P2 | byte-identical P1 rendering plus one tool instruction | exactly one private query broker |

P2's broker accepts no model-supplied program, filesystem path, shell fragment,
or arbitrary predicate. For its sealed case it evaluates only the generator's
already sealed finite Horn program and its sealed query with the local SWI
Prolog binary, returning only `entailed` or `unknown`. The model must still emit
the existing `RESULT:` envelope. The broker, Prolog binary, and program are
private to the per-call root; repository, memories, credentials, arbitrary
commands, network, and other host paths remain unavailable.

## Acceptance criteria

1. The collector has an explicit P2 transport/mode; P0/P1's existing
   `codex-seatbelt` path is unchanged and keeps rejecting every tool/command
   event and `swipl` access.
2. P2 provisions a new root per call and allows only one named private broker
   action. Its recorded trace rejects any second action, arbitrary command,
   path exposure, malformed event, missing native usage, missing broker receipt,
   or a broker result inconsistent with a direct SWI recomputation.
3. The P2 broker executes local SWI from sealed generated source; it neither
   reads the checkout nor receives an answer/oracle as an input. Its output is
   not put in P0/P1 prompts or raw records.
4. The three-condition plan has exactly 24 P0, 24 P1, and 24 P2 records.
   P0/P1 retain the 12/12 pair-order counterbalance. Each P2 record binds to
   the same case, fixture/config bytes, model, sampling, and one-attempt policy.
5. Aggregation and raw evidence distinguish P0-to-P1 representation results
   from P1-to-P2 solver results. Every aggregate remains
   `not-a-cdr-receipt` until fresh CDR β audit.
6. Focused tests include a positive broker call, no-tool P0/P1 negative
   controls, second/foreign command rejection, wrong-broker-result rejection,
   and a real macOS isolated SWI probe. `npm test` passes. No live model call
   happens in CDD implementation or β review.

## Non-goals

- Do not retrofit a solver result into P1.
- Do not expose a general shell or filesystem to P2.
- Do not make a research claim or live call during this CDD cycle.
