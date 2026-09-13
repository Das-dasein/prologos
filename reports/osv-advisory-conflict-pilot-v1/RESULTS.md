# OSV advisory conflict pilot v1 — results

The saved report replays exactly from two content-addressed OSV responses.

| Field | Result |
| --- | --- |
| Target | `npm:lodash@4.17.21` |
| Vulnerability family | `osv:vulnerability:CVE-2021-23337` |
| Retained records | 2 |
| `GHSA-35jh-r3h4-6jhm` | `record_does_not_claim_affected` |
| `GHSA-r5fr-rjxr-66jc` | `record_claims_affected` |
| Expected decision | `pause / goal_conflicted / flag_conflict` |
| Actual decision | `pause / goal_conflicted / flag_conflict` |
| Exact replay | yes |

The two entries are connected by aliases and describe the same vulnerability
identity. They remain separate entry lineages because alias identity does not
show that one report copied the other. The negative Prolog literal means only
that this retained record does not claim the target version is affected. It is
not a package-safety verdict.

This is one case found during exploration. It confirms adapter and execution
wiring only. The preregistered follow-up is
[`osv-revision-dependency-v1`](../../.cdr/waves/osv-revision-dependency-v1/protocol.md).

Replay from the repository root:

```sh
npm run test:osv-advisory
```
