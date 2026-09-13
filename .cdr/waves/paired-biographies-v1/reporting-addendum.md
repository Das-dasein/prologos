# Prospective result presentation — before the repaired full run

The primary harness behavior score stays unchanged: exact output contract,
next move, status, reason, full accepted proof and required checker receipt.
Its label in the human report is **strict response accuracy**. It must not be
presented as a pure measure of selecting the next action.

Alongside it, report these diagnostic components from the same retained
responses, without retries, new judging calls or changes to the oracle:

- **Next-move selection:** completed valid runtime and well-formed move output,
  correct kind and target. For `ask`, the ID must be an authored acceptable
  question and the target must match that declared question's literal.
- **Epistemic status:** same runtime/output prerequisites and exact authored
  safe status. This is the model's status, distinct from gold-memory SWI checks.
- **Proof IDs:** same prerequisites and exact complete authored safe proof set;
  all IDs must be active accepted items. No-memory cannot cite unseen IDs.

These are diagnostics, not replacement primary endpoints. Failures and absent
calls remain in denominators. The full response score additionally checks reason
and receipt. Case and pair joint scores require correct variants, never merely
an answer change. For p09, behavioral scores repeat retained knowledge while
the distractor intervention is visible only to extraction.

The primary causal comparison for this pilot is structured memory without
execution versus the same structured memory with a host-enforced actual check.
No-memory is an information-loss control scored against the full-history oracle.
Results stay synthetic development observations, human gold review pending.
