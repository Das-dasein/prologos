# Luna: 30 original ProverQA questions, paired execution diagnostic

Operator instruction: select 30 dataset tasks, run on Luna, and freeze the work.

The authoritative pre-run contract is `manifest.json`. It pins source bytes,
selection, model, prompts, runtime source hashes, limits and scoring. There are
10 tasks from each source A/B/C class, excluding known earlier diagnostic IDs.
The actual original questions are used, with no substituted Horn subclaims.
Source answers are stored separately in `scorer-only.json`; source FOL and
proof sidecars are not included in any model input.

One Luna formalization is shared by M1 and M2. Both verdicts are independent
fresh Luna calls using the same program and query. M1 gets no execution output;
M2 gets the frozen runtime's transcript. Scores use **model final answers**,
never a host translation of Prolog status. Invalid/missing attempts remain in
the denominator 30. No model retries, repairs or post-hoc sample replacement.
Condition order alternates by case index. Maximum: 90 model calls.

The r4 labelled-program format is retained, but this is not an exact r4
replication: the query changes to `labelled_explanation/3` to support the
original questions, and the two verdicts use one identical answer contract.
Both request the same context window, reasoning effort and wall-clock limit.
Actual usage is retained. CLI sampling and exact effective token-budget
equality are not wire-verified, so this is a diagnostic, not a closed causal
CDR claim or an independent beta verdict. Formalization faithfulness is also
not presumed from syntax or a matching final answer.

The source commit URL recorded by older work returned 404. The source was
retrieved from main and its bytes matched the older frozen SHA-256 exactly.
No current upstream commit identity or redistribution permission is inferred.
Artifacts remain local; no push or publication is part of this run.

The bounded collector is `run-luna-thirty-paired.js`; its seam test is
`test-luna-thirty-paired.js`. It preserves each request, stdout JSONL, stderr,
final output, usage, execution and per-case result, and rejects observed tool
events. Native read-only CLI sessions and trace inspection do not constitute
hermetic isolation. Existing live runtime code is unchanged.

```sh
node test-luna-thirty-paired.js
node test-finite-fol-meta-prover.js
node run-luna-thirty-paired.js .cdr/waves/luna-thirty-paired-v1/manifest.json .cdr/waves/luna-thirty-paired-v1/raw-r1
```

Completed stage receipts can be resumed without an additional model call.
A stage with a persisted request but no receipt stops for explicit disposition;
it is not silently retried. Producing results here does not close the broader
PAM-C1 or executable-memory claim. This is the first 30-task diagnostic slice;
if it informs changes, it becomes development data for later evaluation.
