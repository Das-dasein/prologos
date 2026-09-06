# Gamma CDD decision — issue #68: full-Prolog thought and trusted proof surface

## Decision

The agent-facing cognitive language is **Prolog source**, not JSON and not a
durable custom AST.  A thought may use full Prolog in a fresh capability-empty
process.  Its transcript is untrusted evidence only.

An internal native Prolog term tree may be used by the admission and trusted
query runtimes.  It is an implementation representation, not a proposal API,
not a promised persistence interchange, and not an authority grant.

## Two lanes

```text
LLM Prolog thought source
  -> isolated, read-only, untrusted execution
  -> transcript / run evidence / candidate identity

explicit admission decision + declarative source-backed clauses
  -> immutable accepted snapshot
  -> trusted structural query interpreter
  -> proved proof DAG | unknown missing-goal report | direct-conflict result
```

The trusted lane accepts only source-backed declarative facts and Horn clauses
that the trusted interpreter can represent structurally.  It never consults,
calls, or gives host authority to a thought candidate.  A useful thought rule
may therefore require a separate, explicit admission/re-expression step
before it has trusted memory authority.

## Conflict surface

An overlapping opposite-polarity assertion is neither `proved` nor `unknown`.
The trusted query surface must be able to emit:

```json
{
  "status": "conflict",
  "kind": "direct-polarity",
  "proposition": "...",
  "left": { "proof": { "kind": "fact", "item_id": "...", "source": "..." } },
  "right": { "proof": { "kind": "fact", "item_id": "...", "source": "..." } }
}
```

The exact interval encoding and query operation must be bound in a later
implementation scaffold.  Semantic tension across different predicates
remains an untrusted reflection hypothesis, never this result.

## #23 acceptance reconciliation

| Old #23 wording | Binding interpretation now |
| --- | --- |
| AC1 restricted proposal parser | Superseded: full Prolog thought is allowed only in the untrusted lane; trusted clause intake is structural/native-term validation. |
| AC2 persistent AST | Superseded: preserve Prolog source, immutable IDs and sources. Native terms are internal and ephemeral/implementation-owned. |
| AC3 lifecycle | Explicit admission remains required; hypotheses/candidates remain untrusted. |
| AC4/AC5 | Retain isolated trusted structural inference, proof DAG, and bounded unknown/missing-goal result. |
| AC6 | Upgrade direct temporal polarity conflict from a JS lifecycle projection to an answering-layer-visible structured trusted conflict result with both fact provenance nodes. |

## Boundaries

No arbitrary Prolog becomes trusted merely by parsing.  No API/provider run,
dataset change, evaluator claim, or autonomous hypothesis admission belongs in
this decision.  Implementation of the conflict surface is a fresh CDD alpha
task after this design is reviewed.
