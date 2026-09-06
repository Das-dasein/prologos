# Gamma scaffold: receipt v7 after native OpenAI usage shape repair (issue #49)

PR #48 updates only the pinned answering transport's native ResponseUsage
normalization: it allowlists actual SDK detail fields and rejects arbitrary or
malformed usage shape before local artifacts. Receipt v6 therefore fails closed
on a changed transport source hash. V7 must bind the repaired source without
weakening any v6 evidence condition.

## Required alpha work

- Create forward-only registry/schema/fixture/docs/validator v7 from v6, with
  updated PR #48 wire authority source hashes. Preserve two-authority source
  ownership (transport files only), sealed prompt digests, sampling contract,
  exact native usage/E checks and every inherited gate.
- Independently rebuild registry from current pinned transport; test real SDK
  detail-shaped usage remains valid as canonical counters and arbitrary detail
  shape has already been rejected upstream. V1-v6 invalid. No collector edit.
- Add source drift and all inherited mutation proof. No network/provider/model,
  live raw data/result or method/data/policy changes.

Fresh beta must independently reconstruct and issue `GO_PREPARATION` only.
