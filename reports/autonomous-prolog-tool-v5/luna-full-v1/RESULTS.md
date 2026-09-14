# Autonomous Prolog tool v5: full result

## Outcome

The frozen 48-cell wave completed with 48/48 runtime-valid cells on
`gpt-5.6-luna` at low reasoning effort. There were 73 physical model
dispatches, 73 recorded inference calls, 29 executed local tool calls, zero
denied dispatches, no fallback, and no SDK/HTTP retries. The independently
replayed report SHA-256 is
`bf4771a11565f5646993fe8ae804c2cd6eb0d62bbfd2f81fbc7019399c9715f2`.

| Condition | Tool selected | Status correct | Support membership correct | Canonical exact |
| --- | ---: | ---: | ---: | ---: |
| N: no tool | 0/16 | 12/16 | 6/16 | 5/16 |
| A: tool available, model decides | 9/16 | 14/16 | 10/16 | 9/16 |
| G: exactly one call requested | 16/16 | 16/16 | 10/16 | 10/16 |

Descriptively, optional access improved status by 2/16 and exact answers by
4/16 over N. Guided use improved status by 4/16 and exact answers by 5/16.
The sample is small: exact two-sided paired McNemar tests were not below 0.05
for any frozen comparison. For N→A, p was 0.6875 for status and 0.125 for exact;
for N→G, p was 0.125 for both status and exact. These results are evidence from
one frozen synthetic wave and model, not a general effect estimate.

## Autonomous selection

A selected Prolog in 9/16 cases. Every selected case included the exact primary
query and received a receipt matching the oracle. All nine ended with a
canonical exact answer. Among the seven cases where A skipped Prolog, status
was correct in 5/7 but exact provenance was 0/7.

This 9/9 versus 0/7 split is post-selection and therefore not a randomized
causal comparison: the model chose which cases to send to the tool, and the
status mix differs. It nevertheless answers the behavioral question directly:
the model can discover, formulate, execute and use this Prolog tool without an
explicit call instruction, but it does so selectively and misses cases where
the solver would help.

Selection by oracle status was:

| Status | A selected | A exact |
| --- | ---: | ---: |
| entailed | 3/4 | 3/4 |
| contradicted | 1/4 | 1/4 |
| unknown | 4/4 | 4/4 |
| conflict | 1/4 | 1/4 |

Four of the nine selected cells emitted the natural two-call pair `q` plus
`neg(q)`. Both calls executed correctly. The second call is redundant under the
current checker contract because the primary receipt already reports four-way
status and both polarities. It is a tool-interface efficiency issue, not random
tool spam or a query-formulation failure.

## Receipt-use boundary

Across A and G there were 25 correct primary receipts. Final status remained
correct in 25/25, but exact support provenance survived in only 19/25. The six
downstream failures happened after a correct checker result. G was exact for
0/4 conflict cases, 2/4 entailed cases, and 4/4 each for contradicted and
unknown cases.

Inspection shows that the current tool returns a large `raw_support_sets` list
for many intermediate literals. The model must locate the target and opposite
literal, copy long ID arrays, and serialize them canonically. Failures included
selecting unrelated intermediate support sets, adding one unrelated ID,
dropping one or several IDs, and replacing part of a long negative set. The
solver receipts themselves matched the frozen oracle in every executed primary
call.

## Conclusions

1. Simply making Prolog available is viable: autonomous selection occurred in
   9/16 cases, with correct query and exact final answer in all nine selected
   cases.
2. Availability alone is insufficient: A skipped 7/16 cases and produced no
   exact provenance answer in those seven.
3. Forcing one query removed all observed status errors, but did not guarantee
   exact provenance because the verbose receipt can be corrupted during model
   extraction and copying.
4. The next justified experiment is a frozen raw-receipt versus compact,
   target-scoped receipt ablation. The compact condition should deterministically
   project status plus only the target's positive and negative minimal support
   sets, without changing the checker or model-facing task.

This result concerns system-level tool selection and receipt transport on
synthetic signed-Horn snapshots. It does not establish general Prolog utility,
changed model cognition, natural-language translation fidelity, production
retrieval quality, or real-world agent safety.

## Reproduction

```sh
npm run test:autonomous-prolog-tool-v5
node world/autonomous-prolog-tool-v5/verify-report.cjs \
  reports/autonomous-prolog-tool-v5/luna-full-v1
node world/autonomous-prolog-tool-v5/analyze-report.cjs \
  reports/autonomous-prolog-tool-v5/luna-full-v1
```

The last command deterministically verifies an existing checked-in
`analysis.json` or creates it exclusively when absent.
