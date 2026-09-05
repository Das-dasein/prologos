# Alpha repair report R2 — prospective PAM evaluation amendment

## Scope and role boundary

This fresh CDR α repair addresses the current research surfaces after
independent beta R2. It repairs claim/method/status drift and records a
prospective v2 protocol amendment. It does not modify application source,
`pilot-runner.js`, the saved B4 JSON, dashboard files, or historical beta and
gamma review artifacts. A CDS cycle is required for the missing harness work.

## Canonical PAM-C1–C4 status

The authoritative IDs and meanings are those in `.cdr/claims/open-claims.md`.
The historical `alpha-report.md` used a shifted mapping (it called the
symbolic layer PAM-C1 and final answers PAM-C4). This report and
`prolog-memory-evaluation-v2.md` restore the ledger mapping without rewriting
that historical report:

| ID | Current status | Evidence boundary |
|---|---|---|
| PAM-C1 | `hypothesized` | No complete B1–B4 final-answer comparison or selected baseline score. |
| PAM-C2 | `hypothesized` for the general claim | Independent beta R2 supports a bounded 12-case B5 symbolic slice only. |
| PAM-C3 | `hypothesized` | No executed extraction/error attribution after symbolic correctness. |
| PAM-C4 | `hypothesized` | No executed correction repair-loop evaluation. |

The statuses preserve the ledger's candidate-status enum. The bounded B5
observation is recorded as evidence, not promoted into the unbounded claim.
No positive PAM claim is transmissible.

## Saved B4 artifact audit

The inspected file is
`.cdr/results/prolog-memory-eval-v0/pilot-b4-codex-exploratory-v1.json`.
The following facts were checked without re-running or retro-validating it:

- It declares `condition=B4`, 12 cases, model `gpt-5.6-luna`, 36 extraction
  calls, and 10/12 query-answer matches. Its `evidence_boundary` already says
  `hypothesized_computed_pending_cdr`.
- Dataset, trusted memory, and trusted domain digests in the artifact match
  the current files: respectively
  `ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041`,
  `e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4`, and
  `74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773`.
- The artifact and stored configs identify source commit
  `56d5263afe784aa8ba52b645d4bc49981975474f`, but the stored artifact does not
  carry a config path or a matching config digest. The current Codex config's
  canonical digest is `dc8360d079f08f5aa2e732229e29f901810a8366f6386725152592cf5e84bc76`,
  while the artifact declares `aa5d1f2e3f104f074ff5d3bddd2f18ea473bea964fe1868665efb2eb491c77f9`.
- The artifact's per-call `total_tokens` range is 19,111–19,937. The stored
  historical config says `max_context_tokens=4096`, and the pinned
  `pilot-runner.js` rejects a provider response above that value. Therefore
  the artifact cannot be established as output of that config/runner pair.
- The pinned source commit predates the later commit that added the Codex CLI
  adapter to `pilot-runner.js`. The artifact records Codex adapter fields but
  does not provide an immutable source bundle containing that adapter.
- No raw provider-output references or final answering-model responses are
  present. The recorded matches are Prolog query-binding matches, not
  `PAM-answer-v1` answer evaluation.

Classification: **exploratory, non-transmissible B4-shaped artifact**. It is
retained for provenance and dashboard inspection only; it supplies no CDR
result, no comparative score, and no evidence for PAM-C1.

## Pilot-runner implementation audit

The current runner accepts B1–B5 labels, but the condition label is not proof
that the corresponding memory mechanism ran:

| Condition | What the code actually does | Research classification |
|---|---|---|
| B1 | Sends one extraction prompt per turn and returns an empty expected answer. | Extraction path exists; recent-turn answering condition is absent. |
| B2 | Uses the same extraction path as B1; filters registered query strings by active IDs. | Rolling text summary is absent; label is a simulation. |
| B3 | Parses typed extraction output and computes simple active IDs, but does not implement a distinct non-Prolog state/context passed to an answering model. | Typed-claims/no-Prolog condition is incomplete. |
| B4 | Parses typed output, builds an ephemeral Prolog program, and executes the registered query. | B4 symbolic query slice exists; final answering-model evaluation is absent. |
| B5 | Injects gold writes for the symbolic ceiling. | Bounded symbolic oracle; covered separately by the reviewed CDR gold harness. |

Across B1–B4, the runner calls `provider.extract`; it never calls an answer
provider or `PAM-answer-v1`. `evaluateCase` compares normalized query strings
or synthetic expected answers, and `buildMatrix` counts those matches. There
is no rolling-summary artifact, no condition-specific answer context, no
answer raw output, and no measured cross-condition budget comparison.

This is a mixed repair boundary. Updating the CDR method and status is α
research repair. Implementing real B1–B4 context paths, final answer calls,
raw-output retention, leakage fail-closed checks, and equal measured budgets
is required CDS software repair, handed off in
`cds-handoff-contract-v2.md`.

## Protocol amendment and gates

`prolog-memory-evaluation-v2.md` is the current prospective method. It keeps
the six categories, 12-case pilot, thresholds, baseline-selection rule, and
PAM IDs unchanged. It removes only the old absolute 4096 budget ceiling for a
future run. The next run must preselect an effective budget `E`, measure it on
every B1–B4 request, and prove exact equality before scoring. The already
inspected B4 artifact is outside this amendment.

The wave remains `REVISE`: independent beta R2 is valid for the bounded B5
slice, but there are no full B1–B4 results, no final-answer outputs, no
measured equal effective budget, and no fresh beta review of v2 matter. A CDR
receipt with GO or BOUNDED-GO is prohibited.

## Deterministic evidence

Before this repair, the relevant deterministic checks passed in the current
checkout:

```text
npm test                         => exit 0; all project suites passed
npm run test:cdr-annotation      => exit 0; cdr annotation ok
npm run test:cdr-gold            => exit 0; B5 gold-injection, 12/12 cases
npm run test:cdr-matrix          => exit 0; 12 cases, 36 turns, gold contract
npm run test:pilot               => exit 0; pilot-runner ok: 8 assertions
```

These are software and bounded symbolic checks. They do not establish live
model extraction, final answer quality, context-budget equality, or PAM-C1.
