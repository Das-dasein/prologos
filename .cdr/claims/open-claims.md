# Open claim ledger

These are operator-proposed, unverified claims. Inclusion in this ledger does
not make them transmissible.

| ID | Proposed claim | Candidate status | Decisive falsifier | State |
|---|---|---|---|---|
| PAM-C1 | Prolog-backed structured memory reduces stale-or-contradictory answer errors relative to the strongest non-Prolog baseline under a fixed model and context budget. | hypothesized | No improvement, or improvement disappears under controlled extraction/context. | selected for wave sequence |
| PAM-C2 | The symbolic layer is deterministic and correct when supplied gold claims. | hypothesized | Any wrong active state, conflict classification, or provenance result in the declared oracle suite. | dependency of PAM-C1 |
| PAM-C3 | LLM formalization is the dominant residual error source after the symbolic core is correct. | hypothesized | End-to-end errors are primarily produced by the symbolic/query layer under the registered attribution procedure. | blocked on PAM-C2 |
| PAM-C4 | The repair loop can resolve explicit corrections without retaining the superseded fact as a live conflict. | hypothesized | A resolved correction remains surfaced as unresolved or is used in an answer. | pilot diagnostic |

Claims must retain these IDs through methods, results, reviews, and receipts.
