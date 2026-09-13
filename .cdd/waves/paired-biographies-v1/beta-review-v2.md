# Independent beta repair recheck v2 — APPROVE

2026-09-10. Current readiness verdict: **APPROVE** for the
repaired local Luna development pilot (`gpt-5.6-luna`, `openai-codex`, low).
All three prior blockers R1–R3 are closed. No gold or implementation changes,
commits, subagents, global configuration writes or live model calls by beta.
This is readiness approval, not a positive research finding or a claim that the
new physical transport has already completed a live v2 inference.

## Scope and immutable evidence

Read alpha-repair-v2.md, current changed source, original R1–R3 oracles and the
prospective reporting-addendum.md. Prior per-pair semantic review, p09 limitation
and human-review-pending status remain applicable; unchanged dialogue review was
not repeated. Original v1 review and probes are preserved.

Fresh clean source root:
`/var/folders/l4/s779q4d12qg5l0p5rn3jnprc0000gn/T/paired-beta-v2-ggqis9wz`.
Exact copied files and byte hashes are in
`reports/paired-biographies-v1/independent-beta-v2/clean-copy.json`.
Only declared project runtime/test sources plus cases/schema/manifest were copied;
installed Hermes/Python/SWI remain explicit shared runtime prerequisites.

Executed from that clean root:

```sh
node --test world/paired-biographies/test.cjs
node world/paired-biographies/run.cjs offline --model gpt-5.6-luna --out /Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/independent-beta-v2/offline
/Users/artem/.hermes/hermes-agent/venv/bin/python world/paired-biographies/test_transport.py --report /Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/independent-beta-v2/transport.json
```

Independent results: **17/17 Node tests, 5/5 transport tests, 24/24 real gold
journal/active/proof/status/policy replays pass**. All producing processes exit 0.
`tests.txt`, `transport-tests.txt`, `transport.json`, `offline-command.txt` and
`offline/report.json` preserve these results. Behavior/extraction remain not_run.

Additional beta-authored probes (run from original repository root, loading the
clean copied implementation):

```sh
node reports/paired-biographies-v1/independent-beta-v2/recheck.cjs
/Users/artem/.hermes/hermes-agent/venv/bin/python reports/paired-biographies-v1/independent-beta-v2/adapter-independent.py
```

Their outputs are `recheck.json` and `adapter-independent.json`. All simulated
endpoint responses are explicit offline test data, not model evidence.

## R1 closed: prompt now matches root and complete-gap question policy

Behavior prompt is versioned `paired-behavior-v2`. It permits an unknown query
root with no active defining item to be its own missing-literal plan, and demands
coverage of every remaining gap in a backward rule plan. It preserves explicit
negation/open-world absence, known/conflicted exclusions, cost/count limits and
cheapest-question/tie-ID ordering. Gold did not change.

Independently checked the actual empty-snapshot plans for p06_b/p07_b/p08_b and
confirmed a direct query question with `rule_ids: []`; the new prompt explicitly
permits it. Additional independent p12 rule-plan probe gives no question when
only verified is askable but funded is not; supplying both eligible questions
selects the cheaper/tie-ID question. Reproduced tests separately cover p01's
rule path, contradiction, conflict and no eligible question. Raw/safe semantics
remain unchanged and consistent with the previously reviewed checker.

## R2 closed: original source is parsed before matching

`canonicalize.pl` loads beside the actual world/checker.pl and reuses its
one_term/clause_term grammar; model text is read as terms, never consulted.
`scoreExtraction` records per-prediction validation and compares only valid
parsed clauses. No whitespace deletion repairs the source before validation.

All three original false positives now yield exact=false, matched=0,
invalid_predicted=1, predicted=1. Independent unsafe-variable, extra-clause and
call/compound probes also receive no credit. All invalid predicted items remain
in the denominator. Independently checked:

- `'a b'` differs from `'ab'`; an escaped quote changes atom identity.
- `'lyra'` and `lyra` are the same atom and canonicalize equally.
- Consistent Person→X alpha-renaming and harmless formatting match.
- Independent anonymous variables differ from repeated shared variables;
  a fresh body variable differs from a repeated head variable.
- Extra clauses, undeclared predicates and unsafe head variables are rejected.

The score version is `paired-extraction-score-v2`. Natural-language paraphrase
correctness and logical equivalences beyond parsed-clause normalization remain
explicitly unaudited; no gold semantics were expanded.

## R3 closed: one physical dispatch is enforced below retry loops

`AttemptBudget` is shared across all ControlledAgent-created OpenAI clients.
`GuardedTransport.handle_request` checks it before the underlying transport;
physical attempt 2 raises a BaseException guard before dispatch. SDK retries are
forced to 0, the concrete HTTPTransport has retries=0, and recreated clients
retain the same budget. The scorer now rejects old method-entry-only evidence,
multiple/denied physical attempts, transport failures and non-completed provider
terminal status.

Reproduced actual installed Hermes retry-loop/real SDK fault tests: connection
failure, mid-stream failure and deliberately re-enabled SDK retries each permit
only one mock endpoint dispatch and retain first-attempt error/partial bytes;
the second attempt is denied. Ordinary completed streams still pass.

Independent beta went beyond those producer tests: extracted the **exact**
ControlledAgent class AST from the copied adapter and executed its client
construction override against the installed AIAgent superclass and real OpenAI
SDK with a mocked transport endpoint. A client requested with SDK max_retries=2
is forced to 0; closing it and constructing a second shared client does not reset
the budget. Only one endpoint call occurs and the second is denied. Separately,
a 4-byte response with a 3-byte bound produces stream_error, and an incorrect
runtime fingerprint causes adapter failure before auth/inference (0 calls).

The actual installed client factory honors supplied http_client; its primary,
replacement and request-client paths call the overridden factory. This was
checked in run_agent.py and agent_runtime_helpers.py. Those runtime route checks
are scoped to the installed source, not future versions or all providers.

Physical request body and streamed bytes/status/errors are retained without
headers. Atomic save leaves the last complete receipt if the outer process is
killed. Normal close before HTTP EOF is acceptable only alongside a completed
provider terminal result; stream errors cannot earn credit.

## Version and reporting verification

`verification-summary.json` confirms:

- Dataset unchanged:
  `8ced0edd45ca32c3843fcb0a8922a0f3c53635a8c903dedd834a0a86fa39a1e2`.
- Schema unchanged:
  `e0e151139a9e8805983e271774b6b43a214bc2713e066d0e68bb82990a2a4fd6`.
- Current reviewed project sources match the clean run's declared source hashes.
- Runtime fingerprint matches before/after independent review:
  `a00cac42469c082fddd02c2a34814b183bee9ebade9ae536c495c742b2fe6d60`.
  The manifest includes 16 selected installed Hermes/SDK/httpx/httpcore files,
  package versions and Node/Python/SWI versions. This is a declared selected-file
  fingerprint, not an exhaustive hash of the complete host or every dependency.
- Requested low/4096 and effective unavailable output cap/context/sampling fields
  remain distinct. No equal effective-token-budget claim is introduced.

The prospective reporting addendum is appropriate: strict response accuracy
remains primary; action-choice, safe-status and proof diagnostics are labelled
separately and retain runtime/shape prerequisites and failed/missing denominators.
An incorrect proof need not be described as an incorrect action choice. These
are report specifications, not independently executed component-score code yet.

## Readiness boundary

The reviewed repaired apparatus is ready for the separate Luna pilot. No new
blocking finding arose in the changed R1–R3 surfaces. Gamma may observe the first
real v2 dispatch for transport integration errors and stop if it fails; such an
observation is not represented by these offline tests. Do not mix v1 Sol/Luna
smokes or retroactively certify their physical attempt counts. Use a fresh run
directory and preserve any actual failures.

Keep human_review pending, p09's behavioral distractor intervention absent
(extraction only), no-memory as an information-loss control, and structured
without-check versus checked as the primary apparatus comparison. No autonomous
retrieval/admission, extracted-memory end-to-end or dreaming claim follows.
CDR memory benefit remains indeterminate until actual evidence and separate
research review support a stronger statement.
