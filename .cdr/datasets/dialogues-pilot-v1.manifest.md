# dialogues-pilot-v1 manifest

Origin: authored by CDR α on 2026-09-03 as a synthetic, privacy-safe pilot.
No user, employer, API, email, secret, or third-party personal data is used.

Intended use: local evaluation of the registered PAM claims: PAM-C1
comparative Prolog usefulness, PAM-C2 symbolic correctness from gold claims,
PAM-C3 extraction/error attribution after symbolic correctness, and PAM-C4
explicit-correction repair-loop behavior. The dataset supports these claims'
case coverage; it does not itself establish any of them.
Redistribution: permitted as synthetic project evidence; not a claim about
real users. The JSONL has exactly 12 records and exactly two records in each
registered category.

Claim-ID correction: this canonical manifest mapping was repaired on
2026-09-05. The JSONL bytes and SHA-256 are unchanged; the prior shifted
mapping remains only in the historical alpha report.

Schema: one JSON object per line with `case_id`, `category`, `dialogue` (ordered
`speaker`/`text` turns), `gold_operations` (turn-indexed `write`, `supersede`,
`clarify`, or `ignore`), and `oracle` (`active_claims`, `conflicts`, `query`,
`query_answers`, `provenance`). Claim proposals use the implementation's
allowlisted relation, polarity, lowercase snake-case atoms, inclusive integer
dates/null, and confidence in [0,1].

Coverage: stable recall (stable-01, stable-02); explicit
correction/supersession (correction-01, correction-02); temporal change without
contradiction (temporal-01, temporal-02); direct positive/negative conflict
(conflict-01, conflict-02); non-memory content (nonmemory-01, nonmemory-02);
alias/coreference ambiguity (ambiguity-01, ambiguity-02).

SHA-256 (computed after writing): see the `sha256` field below and verify with:

```sh
shasum -a 256 .cdr/datasets/dialogues-pilot-v1.jsonl
```

sha256: ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
