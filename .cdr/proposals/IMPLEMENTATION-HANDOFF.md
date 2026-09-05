# Offline evaluation v3 — handoff

Branch: `chore/offline-eval-v3-handoff`.
Contract: [evaluation-contract-repair-v3.md](evaluation-contract-repair-v3.md).
Status: prepared for implementation; no v3 evaluator implemented and no independent beta verdict.

## Start here

1. Read the proposal and `.cdr/POLICY.md`.
2. Verify the baseline with `npm test` and `npm run test:pilot` (fake providers; no live pilot).
3. Verify SHA-256 of every file listed in `reports/live-20260905-152059/manifest.json` relative to that directory.
4. Implement `offline-eval-v3.js` and its independent fixtures, following proposal acceptance sentinels. First repair fact matching and unknown/coverage semantics; then answer/provenance diagnostics.
5. Replay frozen B1–B4 records to a NEW artifact; keep historical scores, text and hashes immutable. Use archived raw paths via manifest mapping, not original /tmp paths.
6. Add an offline npm command, document it, update the dashboard only with versioned replay evidence. Request fresh independent beta review after pinning implementation.

## Boundaries

- User explicitly forbids another model run. No live pilot, LLM judge, provider retries or paid calls. No automatic dispatch of model sessions.
- Runtime changes (supersession, answer-v3 envelope, predicate/query reconciliation) are a separate next scope. This handoff does not claim they work.
- Never change gold labels or introduce semantic aliases to make the inspected run pass.
- Proposal is post-hoc diagnostic design, not prospective registration or approval of PAM-C1.

## What is saved

- Historical aggregate, 192 original raw envelopes, config, post-hoc analysis and integrity manifest under `reports/live-20260905-152059/`.
- Raw hashes checked against original aggregate references. Original paths retained for provenance, portable archive paths provided by manifest.
- Dashboard: `reports/pilot-b4-codex-exploratory.html`; it uses only B4 of the same v2 aggregate.
- Existing local adapter fixes for Codex schema types, usage accounting and effective-budget/config plumbing are included in this preparation. They do not repair the scoring contract.
- Exact source executed by the historical run remains uncertain; committing current code does not retroactively resolve it.

Dashboard rebuild (offline):

```sh
node pilot-dashboard.js --result reports/live-20260905-152059/aggregate.json --analysis reports/live-20260905-152059/analysis.json --output reports/pilot-b4-codex-exploratory.html
```

The preparation commit is a handoff checkpoint, not a release. No push, merge, CDR GO or beta approval is implied.
