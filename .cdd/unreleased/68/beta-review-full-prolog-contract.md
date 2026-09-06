# Beta review — issue #68 full-Prolog contract

Target reviewed: `048c5d33c32c3f0fda86b6e37e3e2515e22bc910` (`gamma
<gamma@prologos.cdd.cnos>`).  This is an independent CDD design gate.  No
provider was invoked, and this review adds neither an agent-facing JSON/AST
language nor an implementation change.

## Verdict: REVISE

The central decision is sound and matches the current user direction: the
agent authors **Prolog source**; a full-Prolog thought process is isolated and
its stdout/exit state remains untrusted; a separate trusted structural query
runtime derives proof objects only from an accepted snapshot.  The gamma text
also correctly leaves the answering-layer direct-conflict/provenance object as
future work rather than presenting the current JavaScript lifecycle projection
as that object.

One admission-boundary statement needs repair before this can be the binding
reconciliation for #23.

## Finding B68-1 — accepted snapshot currently admits arbitrary source

The proposed two-lane diagram says that the trusted lane begins with
“explicit admission decision + declarative source-backed clauses”, and the
#23 reconciliation calls its intake “structural/native-term validation”.
That is the right intended boundary, but it is not the current admission
contract:

- `admitCandidate` in `cognitive-memory.js` appends `candidate.program`
  unchanged and labels it `status: "accepted"`; it performs no declarative
  shape validation at admission.
- An independent reproduction admitted
  `:- initialization(halt).` with an explicit decision.  The resulting
  immutable item was `{"program":":- initialization(halt).", "status":"accepted"}`.
- `trusted-query-runner.pl` does not consult candidate text as executable
  clauses; it reads text as terms during proof traversal and only has
  fact/Horn-rule proof cases.  Thus the directive does not acquire trusted
  execution authority.  This preserves the vital safety boundary, but it is
  not the same thing as an admission rule guaranteeing that every accepted
  item is a representable declarative clause.

This is **not** an argument for reviving an agent-facing JSON AST or a bespoke
thought grammar.  The repair is documentation-level: either define the
current accepted snapshot as immutable source plus explicit admission
provenance, with unsupported source deterministically unavailable to the
trusted interpreter; or state the minimal native-term declarative admission
check that will later be implemented.  In both versions, parsed/native terms
stay internal and no arbitrary full-Prolog thought becomes trusted merely by
being parsed or admitted.

The follow-up scaffold must separately bind the structured trusted
direct-polarity answer: query operation and interval representation, both
fact/proof provenance nodes, and the distinction from untrusted semantic
tension.  Current `directConflicts` remains a JavaScript lifecycle projection
and is insufficient evidence for that response surface.

## Reproduced evidence

| Check | Result |
| --- | --- |
| `npm run test:cognitive-memory` | PASS — isolated full-Prolog transcript, separate multi-hop proof, unknown, lifecycle and JS conflict fixture |
| `npm test` | PASS |
| `git diff --check` | PASS |
| Direct unsafe-admission probe above | reproduces B68-1; no trusted execution was attempted |

The existing `test-cognitive-memory.js` forged-output fixture additionally
shows that a candidate's proof-looking stdout stays untrusted and a later
trusted query returns `unknown`, supporting the core two-lane claim.

## Required gamma repair

Amend the #68 decision to name the current admission representation truthfully
and to make the future trusted declarative intake an explicit work item.  Do
not introduce JSON/AST proposal authoring, do not broaden thought authority,
and do not claim the structured conflict response is implemented.  After that
clarification, a fresh beta can re-check the final binding text.
