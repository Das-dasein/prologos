# CDR wave manifest: paired-extraction-repair-v1

Status: `completed-development-run; 7-of-8 failed cases repaired exactly`.

This bounded follow-up tests one idea from solver-guided formalization work in
the repository's own extraction pipeline: feed deterministic grammar errors
back to the same model once, then validate the complete repaired candidate set
again. No external implementation is used.

The source is the frozen Luna extraction run in
`reports/paired-biographies-v1/luna-full-review-v2/report.json`, SHA-256
`6a79ca16d43513064049aa12b6af5c35026f86aa4c92d1498e00beecde2689db`.
Its first pass scored 16/24 exact. Exactly eight failed cases enter repair; all
16 first-pass successes remain unchanged.

The repair prompt receives dialogue, vocabulary, admission policy, the original
candidate set and per-candidate deterministic parser diagnostics. It receives
no gold candidate, oracle decision, expected admission or proof. Candidate
count, order, IDs and all fields except invalid `program` strings must remain
unchanged. One fresh model call is allowed per failed case, with no retry and no
second repair. Repaired output remains a candidate set and is scored by the
existing SWI-backed extraction scorer.

Report first-pass exact, repair-only exact, combined exact, invalid programs
before/after and runtime failures. A gain demonstrates bounded syntactic
recoverability under explicit feedback. It does not establish spontaneous
semantic formalization, truth, admission quality, end-to-end memory utility or
solver benefit at answer time.

```sh
node --test world/paired-biographies/extraction-repair.test.cjs
node world/paired-biographies/extraction-repair.cjs offline
node world/paired-biographies/extraction-repair.cjs live --out reports/paired-biographies-v1/luna-extraction-repair-v2
node world/paired-biographies/verify-extraction-repair.cjs reports/paired-biographies-v1/luna-extraction-repair-v2
```

The earlier `luna-extraction-repair-v1` run had equivalent model-call guards
and scores but omitted run-start source snapshots. It remains preliminary
engineering evidence and is not the authoritative wave result.
