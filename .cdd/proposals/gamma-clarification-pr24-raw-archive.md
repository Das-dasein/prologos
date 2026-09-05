# Gamma clarification: PR #24 historical raw archive

Date: 2026-09-06  
Role: gamma  
Triggered by: `.cdd/proposals/beta-pr24-prolog-reframe-review.md`

## Finding disposition

Beta correctly found that PR #24 adds 198 raw files under
`reports/live-20260905-152059/` relative to `origin/main`. The prior wording
"no live artifact" made their presence indistinguishable from an unreviewed
partial run.

The files are not the partial Luna run. They are the immutable historical
archive referenced by `offline-eval-v3.js`, its manifest and the bounded CDR
offline-replay receipt. Removing them would make the committed v3 frozen replay
non-reproducible and invalidate the already reviewed engineering diagnostic.

## Corrected boundary

The archive is retained only as a hash-bound historical input to evaluator v3.
It does not count as output, evidence or a result of issue #23. Issue #23 may
not add or inspect newly generated provider output. The untracked directory
`reports/live-20260905-225936/` remains excluded and has no aggregate or CDR
standing.

The issue pack and gamma preparation now name this distinction explicitly.

## Required beta re-check

A fresh beta must verify:

1. the historical archive's manifest and replay tests still pass;
2. no tracked path under `reports/live-20260905-225936/` exists;
3. no new raw path was added after the documented historical archive;
4. the Prolog cognitive-memory design and issue scope treat the archive only
   as v3 compatibility input; and
5. no provider execution or CDR claim was introduced.
