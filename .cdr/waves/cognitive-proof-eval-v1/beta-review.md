# Beta review: cognitive-proof-eval-v1

Role: fresh independent CDR beta. Reviewed immutable alpha target
`756ad31dc7dbbf28f1eab0e2f7f0dabe121c3b3c` (alpha source pin
`82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`) against `.cdr/POLICY.md`,
the v2 historical method/status, the cognitive-memory design, and the issue
#26 gamma scaffold.

## Verdict

**GO — offline method/dataset adequacy only.** This is not a PAM-C1 verdict,
CDR receipt, live-result approval, or usefulness conclusion. The historical
`prolog-memory-eval-v0` status remains `REVISE`.

## Independent clean reproduction

A detached clean worktree at the target was created. Before dependencies were
installed, the deterministic oracle and focused core test passed; `npm test`
then stopped solely because that new worktree did not yet contain the declared
`zod` dependency. After `npm ci` in the same clean worktree, all commands
passed:

```text
git diff --check 756ad31^ 756ad31
shasum -a 256 .cdr/waves/cognitive-proof-eval-v1/dataset.json
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
npm run test:cognitive-memory
npm test
```

The recomputed dataset SHA-256 is
`dd0ed11f7547940f7ce33e3b1118b27aa41bfcd786040706b2b9fc37f9729a75`,
matching the manifest. The oracle returned `offline-symbolic-ok`: all 12
stored trusted results reproduced. Exact coverage was two cases each of
multi-hop, unknown, revision, temporal conflict, provenance, and untrusted
thought. Revision active IDs and direct-polarity conflict metadata also passed.

For both thought fixtures, beta separately supplied the fixture's untrusted
transcript as a candidate program to `runThought`; each result was marked
`untrusted`, and trusted reruns from the immutable accepted snapshot were
identical before and after. The checked-in validator additionally exercises a
deliberately forged full-Prolog candidate and verifies that its transcript
cannot change either trusted result.

## Boundary and calibration audit

- The target diff adds only offline wave documents, a synthetic/sanitized
  fixture, and its deterministic validator. It contains no `data/memory.pl`,
  live/provider/raw artifact, secret, receipt, hidden claim-status edit, or
  threshold modification.
- P0 is the normalized accepted snapshot plus query. P1 is P0 plus only the
  trusted proof DAG or bounded missing-goal result. PX adds a labelled
  untrusted transcript and is explicitly exploratory; it cannot select or
  support the primary comparison.
- The method explicitly defers to future CDS/live work: assembled-prompt
  construction and hashes, per-request measured equal `E`, raw answer and
  usage retention, answer/provenance scoring, and a pre-call oracle-leak
  sentinel. It prohibits `expected_result`, its hash, category, and hidden
  answer-contract fields from model prompts. Thus the symbolic oracle is not
  represented as an answer-quality measure.
- No provider/model call, observed/computed effectiveness result, CDR receipt,
  or claim that the system is useful appears in this wave. The declared
  limitation is aligned with policy: a future human-operated live run and a
  fresh independent beta remain necessary.

## Residual scope

This GO establishes only reproducible, bounded symbolic fixtures and an
adequate prospective comparative protocol. It does not make the future
equal-E, prompt-leakage, raw-retention, scoring, or live-answer gates
executable; absence or failure of any of those future gates must remain
`REVISE` or `INDETERMINATE`, never a positive PAM-C1 conclusion.
