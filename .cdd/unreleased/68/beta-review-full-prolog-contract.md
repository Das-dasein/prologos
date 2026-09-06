# Beta review R1 — issue #68 full-Prolog contract

Target reviewed: `2a14484` (`gamma <gamma@prologos.cdd.cnos>`), which repairs
the earlier `96129f1` wording. This is an independent CDD design gate. No
provider was invoked; this review adds no agent-facing JSON/AST language and
no implementation change.

## Verdict: GO

The repaired decision truthfully separates the present implementation from
the intended trusted intake:

- The agent-facing language remains Prolog source. Full-Prolog thought runs in
  the isolated untrusted lane; its transcript and exit state are evidence, not
  trusted inference.
- `admitCandidate` currently retains raw `candidate.program` after an explicit
  decision. It has no declarative-shape gate. The gamma document now says so,
  rather than claiming every accepted item is already a declarative clause.
- Accepted raw source is not trusted execution authority. The trusted runner
  transports it as `pam_item/3`, reads an item term during structural proof
  traversal, and has proof cases only for facts and Horn rules. Unsupported
  source cannot produce a trusted proof merely because admission preserved it.
- A native-term declarative intake check is explicitly future,
  implementation-owned work; it is not a revived proposal JSON schema, custom
  thought grammar, or durable agent-facing AST.
- The direct-polarity JSON object is a required future answering surface. The
  document says its operation/interval encoding must be bound later and maps
  AC6 as an upgrade from the existing JavaScript lifecycle projection. It
  therefore does not claim that structured trusted conflict response exists
  today. Cross-predicate semantic tension stays untrusted.

The two-lane diagram names the target contract; its following “Current
implementation truth” and “Future trusted-intake work” sections remove any
claim that the target admission/conflict surface has already landed.

## Independent evidence

| Check | Result |
| --- | --- |
| `npm run test:cognitive-memory` | PASS — isolated full-Prolog thought, trusted multi-hop proof, absence, lifecycle and JS conflict fixtures |
| `npm test` | PASS |
| `git diff --check 96129f1..2a14484` | PASS |
| `git diff --check` | PASS |
| Raw-admission probe | PASS — explicit admission retained `:- initialization(halt).`; a trusted query for `unrelated_goal` returned `{"status":"unknown","missing":["unrelated_goal"]}` and did not execute the directive |

The probe establishes the precise current boundary needed for this review: raw
admission is possible, while trusted proof traversal does not execute that
source. It is not evidence that the planned native-term admission check or
structured trusted conflict response is implemented.

## Follow-up boundary

Implementation remains out of this documentation decision. A later CDD task
must separately specify and build native-term admission/quarantine and the
trusted direct-conflict query operation with interval and both proof
provenance nodes. It must keep full-Prolog thought untrusted and must not add
an agent-facing AST.
