# OSV advisory conflict pilot v1

Date: 2026-09-13. Status: completed exploratory engineering pilot.

## Question

Can the real persistent world path retain two current OSV records about one
alias-connected vulnerability, evaluate their npm SemVer claims, and pause when
the records disagree for one exact package version?

## Frozen input and procedure

- Fetch `GHSA-35jh-r3h4-6jhm` and `GHSA-r5fr-rjxr-66jc` from the OSV API.
- Retain the exact response bytes under their SHA-256 names.
- Evaluate both records for `npm:lodash@4.17.21` with the bounded adapter.
- Use aliases only to identify the vulnerability family. Keep each OSV entry as
  a separate lineage; aliases do not establish copying or common provenance.
- Admit each deterministic record assessment through `observe -> propose ->
  admit`, start the exact query, and call the real `WorldAgent.step()`.
- Replay the report from retained receipts and require the same descriptors,
  receipt hashes, query, snapshot hash and decision.

The case was selected after exploratory inspection of live OSV records. It is
therefore a witness, not a prevalence sample or a preregistered accuracy test.

## Expected result

One record must produce `record_claims_affected`; the other must produce
`record_does_not_claim_affected`. The signed-Horn checker must expose a direct
conflict and the agent must return `pause / goal_conflicted / flag_conflict`.

`record_does_not_claim_affected` is intentionally weaker than `unaffected`.
Withdrawal likewise does not mean that a package version is safe.

## Claim boundary

Success establishes one reproducible natural metadata disagreement passing
through the repository's journal, checker and decision path. It does not decide
package safety, identify the true record, validate all OSV range semantics,
exercise historical revisions or prove that provenance-aware memory outperforms
a simpler implementation.

## Environment

- Node.js `v24.7.0`
- SWI-Prolog `10.0.2` for arm64-darwin
- `semver` `7.8.5`, exact dependency
