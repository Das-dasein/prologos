# CDR beta review R1 — prolog-memory-eval-v0

## Review context

- Role: independent research beta, fresh session, distinct from alpha.
- Scope: repaired matter F1–F5 and the overall wave gate only.
- Binding: `.cdr/POLICY.md`, `manifest.md`, `status.md`, and the alpha repair
  dispatch/report. The invalid same-session review was not used as evidence.
- No application source code was modified by this review.

## Verdict

**REVISE**

F1, F2, and F4 are repaired sufficiently on inspection and by the bounded
gold-injection checks below. F3 remains an explicit blocking limitation: the
method names a canonical CDS harness but no pinned harness/configuration or
raw run output exists in this snapshot, so the method is not executable as
written and its leakage/budget sentinels cannot be reproduced. F5 is not
fully closed: the declared source snapshot checksum fails for
`memory-store.js`. Therefore the overall GO/BOUNDED-GO gate is not met.

## Findings

### F1 — repaired query-answer oracle

**PASS (bounded).** The six repaired query forms now reference the intended
injected claims or declared rules. In particular, stable-01 and correction-01
use `active_claim/7`; stable-02 uses `knows_technology/2`; correction-02 uses
`current_project/3`; and both temporal queries bind `active_claim/7` and call
`overlaps/4`.

Independent command (run from the project root) injected every gold `write`
claim and declared `supersedes/2` edge into `memory.pl`, then executed each
JSONL `oracle.query` through `prolog-engine.js`. Results matched the registered
answers for all 12 cases (including both correction and both temporal cases).
This is symbolic-oracle evidence only, not an architecture or model result.

Evidence: `memory.pl`, `prolog-engine.js`,
`.cdr/datasets/dialogues-pilot-v1.jsonl:1-12`,
`.cdr/results/prolog-memory-eval-v0/pilot-oracle.json`.

### F2 — end-to-end answer oracle

**PASS (bounded).** `answer-oracle-v1.json` is present, marked authored before
model output, and has one contract and one case entry for each of the 12
dataset IDs. Each memory-backed entry specifies expected fact, source claim
IDs, source turns, inclusive intervals, and stale/contradictory classification;
non-memory and ambiguity entries require no durable fact. A local structural
check found 12 dataset records, 12 answer entries, and no source claim IDs
outside the case's gold writes.

The natural-language semantic matcher remains the responsibility of the
future harness; no model scoring is claimed here.

Evidence: `.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json`,
`.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r1.md:15-20`,
`.cdr/methods/prolog-memory-evaluation-v1.md:66-74`.

### F3 — executable harness and sentinels

**FAIL / unresolved; blocking.** Method v1 now fixes provider class,
sampling, retry policy, prompt IDs, 4096-token budget, canonical command,
leakage-abort behavior, and budget-rejection behavior. However, the required
separately pinned CDS harness and `eval-config-v1.json` are absent: no
`run-eval.js` or equivalent command is present in the workspace, and no raw
machine-readable evaluation output exists. Consequently beta cannot execute
extraction/end-to-end conditions, verify fail-closed leakage detection, or
verify cross-condition effective-budget rejection.

Evidence: `.cdr/methods/prolog-memory-evaluation-v1.md:35-58`,
`.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r1.md:21-25`;
command `find . -path '*run-eval.js' -o -name 'eval-config-v1.json'` returned
no files.

### F4 — baseline selection and comparability

**PASS (protocol text).** The repaired method pre-registers selecting the
strongest non-Prolog baseline from B1–B3 by stale/contradictory error, then
general-answer error, then fixed B3/B2/B1 tie-break order, while requiring all
baseline scores. It also fixes the shared provider class, prompts, sampling,
retry policy, and effective context budget. This closes the prior
post-result-selection ambiguity at the specification level. Execution of this
rule remains pending F3's harness.

Evidence: `.cdr/methods/prolog-memory-evaluation-v1.md:28-34,61-64`,
`.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r1.md:26-30`.

### F5 — source provenance and checksum

**FAIL / unresolved; gate-blocking integrity defect.** The manifest's Git
status statement is now accurate: `git rev-parse --is-inside-work-tree`
returned `true`, while `git log -1` reported no commits. The dataset hash also
matches its manifest. But the required source integrity command failed:

```text
shasum -a 256 -c .cdr/datasets/source-snapshot-2026-09-03.sha256
memory-store.js: FAILED
shasum: WARNING: 1 computed checksum did NOT match
```

The current digest is
`ae8bf3bb08ae53f2c2243e1f85b49e90c1f02981e1ff7afa9ad45866f5bfedd9`, while
the manifest pins `8c1f2b41519bac7d9e1f00fa3d6e4c2dba9a64b9043ae7edf52707798bdbbab1`.
The other 14 listed files returned `OK`. Until the snapshot is regenerated or
the source is restored and the provenance is re-pinned, clean-copy source
identity is not reproduced.

Evidence: `.cdr/datasets/source-snapshot-2026-09-03.manifest.md:1-20`,
`.cdr/datasets/source-snapshot-2026-09-03.sha256:1-15`.

## Passing checks and boundaries

- `npm test` passed: `ok`, `memory-store ok`, `codex-provider ok`.
- Dataset SHA-256 matched manifest:
  `88776d46d0ddd34307ef4cfd519e68f17862fd51118463a0ef9497cd25ba0f9f`.
- Dataset shape remains 12 unique cases, exactly two in each registered
  category; pilot oracle and answer oracle each cover all 12 IDs.
- No private `data/memory.pl` content was used.
- No live-model, product-usefulness, novelty, or statistical claim is
  supported by these checks.

## Receipt decision

**Receipt is not allowed.** The wave remains `REVISE` pending (1) a separately
pinned executable CDS harness with reproducible sentinel behavior and raw
output, and (2) correction of the source snapshot checksum mismatch followed
by a fresh independent beta re-audit. No PAM architecture claim is
transmissible from this review.
