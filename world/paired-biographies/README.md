# Paired biographies harness v2

Executable synthetic development pilot: 12 pairs / 24 authored case records,
four controlled memory conditions, three separately reported score surfaces.
Human gold review remains pending. This is a controlled installed Hermes
AIAgent comparison with injected gold memory and host-supplied Prolog evidence.
It does not test spontaneous production provider retrieval, admission or tool
selection, and it does not establish a memory benefit.

Run from `/Users/artem/Documents/code/prolog-agent-memory` with Node, SWI-Prolog
and the installed Hermes venv (includes jsonschema 4.26.0). No new packages.

```sh
npm run test:paired-biographies
node world/paired-biographies/run.cjs offline --out reports/paired-biographies-v1/offline-review-v2
node world/paired-biographies/run.cjs live --pairs p01 --extraction first --model gpt-5.6-luna --out reports/paired-biographies-v1/luna-smoke-review-v2
node world/paired-biographies/run.cjs live --pairs p01,p05,p06,p07,p08 --behavior none --dream eligible --model gpt-5.6-luna --out reports/paired-biographies-v1/NEW_DREAM_RUN
npm run test:paired-dream-report
npm run test:paired-dream-matrix-report
npm run analyze:paired-argumentation -- --out reports/epistemic-theory-counterexample-v1/paired-argumentation-projection-v1.json
```

Последняя команда не вызывает модель и не оценивает Hermes. Она строит
read-only support-attack-v0/Dung проекцию из авторских active gold snapshots и
сравнивает её статусы с raw/safe. Запись создаётся только по новому пути.

The harness v2 has a retained independent runtime audit, and gamma completed
the full Luna pilot: 96 behavior calls and 24 separate extraction calls. That
audit concerns the calls and retained evidence; it does not approve the
synthetic dialogue-to-formalization semantics, which remain pending human and
independent semantic review. See [results](/Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/RESULTS.md).
To reproduce into a fresh directory:

```sh
node world/paired-biographies/run.cjs live --pairs all --extraction all --model gpt-5.6-luna --out reports/paired-biographies-v1/luna-full-reproduction-v2
```

Use `--model gpt-5.6-terra` for a separate Terra run. Without `--model`, the
runner reads the installed Hermes configured model; provider is pinned to
`openai-codex`. A report uses exactly one selected model. Source/Python locations
can be overridden via `HERMES_SOURCE` and `HERMES_PYTHON`; no global config is
modified. The adapter currently supports the installed `codex_responses` route.
An existing output directory is rejected. Choose a fresh directory to reproduce.

`offline` validates the manifest byte/hash pins, the complete official JSON
Schema, pair identity/equality/contrast/invariance, coverage, message/item/source
references, timing, replacement and admission partitions, explicit active and
proof references, question shape and signed-Horn syntax through real SWI.
Every gold case is then independently replayed through actual
`WorldAgent.observe/propose/admit`, candidate retention and snapshot projection.
Real raw/safe statuses, proof nodes and source mappings are compared to authored
constants. A simulated WorldAgent next-step policy check validates oracle
question/target/reason coherence; it never executes an action. Source excerpt
meaning, actual-user versus hypothetical phrasing and NL/formal translation
fidelity still require independent semantic review. Mechanical consistency is
not a substitute for that review.

The four primary behavior conditions are `no_memory`, `text_memory`,
`structured_no_prolog`, and `checked_prolog`. All use the same present dialogue,
vocabulary and decision policy. The text lane renders ordinary NL assertions
and rules with the same IDs, source role/text, status, observed/admitted ticks,
validity and replacement links as the formal lane. Inactive accepted history
and retained candidates remain visible with their qualifiers; no computed
active list, expected admission, rationale, pair/category label or oracle
proof is injected. The checked lane adds a real checker receipt bound to the
query/snapshot. It does not add the oracle decision. Prolog is executed by the
host, not chosen as a tool by the model.

`--dream eligible` is a separate opt-in fifth condition only for records whose
authored `dream_eligibility` flag is true. It adds a host receipt with positive
and negative disposable-assumption branches, but no host decision or oracle.
It remains separate from the four-mode table and does not measure spontaneous
dream/tool selection or establish a benefit. Its first Luna follow-up is
[recorded separately](/Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/luna-dream-eligible-v1/RESULTS.md).
A two-repetition counterbalanced Luna matrix is also
[recorded separately](/Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/luna-dream-matrix-v1/RESULTS.md);
its small descriptive difference is not a benefit claim.

Each inference constructs an installed AIAgent in a new Python process and
fresh temporary HERMES_HOME/work directory. Credentials are resolved into
process memory before isolation; no credentials/config/private memory are
copied into reports. All modes expose zero tools, disable built-in memory,
context files and soul identity, and use no session DB or history. The frozen
system-prompt assembly hook suppresses generic host/date metadata. Actual model
messages must exactly equal the requested two messages before network dispatch.
Wire tools must be empty; wire model must match the chosen model.

The runner requests low reasoning and max_tokens 4096, permits one physical
HTTP dispatch and no fallback/retry, imposes a 120-second outer timeout and an
8 MiB evidence cap (physical response stream capped at 2 MiB). Every AIAgent
OpenAI client, including recreated clients, uses a shared transport budget.
The SDK max_retries and underlying HTTPTransport retries are both zero. The
httpx handle_request boundary records the exact body and streamed bytes/errors;
a second dispatch is blocked before reaching the underlying transport even if
Hermes or the SDK retries. Scoring requires one physical dispatch, no denied
retry, successful stream closure and a completed provider response. **The installed Codex transport omits max_output_tokens on the wire**, so
4096 is not an enforced output-token cap. Evidence records
`effective_output_token_cap: null` and actual input/output/reasoning/cache usage.
Same requested settings do not imply equal observed token budgets. Different
representations produce different token counts. Temperature, top_p and context
ceiling are explicitly unavailable unless present in recorded wire/settings;
no equality of unknown provider sampling defaults is inferred. Process errors/timeouts stay
in denominators; unselected/unattempted observations remain `not_run`.

Behavior scoring accepts only exact JSON with the declared move fields, exact
kind/status/reason and semantic target, policy question IDs from acceptable
alternatives, and the complete active accepted proof ID set. Checked output
must acknowledge the exact host receipt ID. Wrong targets, extra fields,
missing/forged proofs, malformed JSON, tool exposure and incomplete runtime
calls fail. Internal strategies are unaudited; structured candidate citations,
wrong statuses, actions and question choices are observable. No free-prose
substring matching or LLM judge is used. Pair joint accuracy requires both
correct variants; contrast/invariance success never means merely changing or
preserving a wrong answer.

Extraction uses its own model call with dialogue, vocabulary and admission
policy only. All outputs remain candidates. Scoring matches source, canonical
program, modality, timing and replacement topology against authored extraction
annotations; arbitrary generated item IDs are mapped, never exposed in advance.
Original candidate strings are parsed by actual SWI one_term/clause_term from
world/checker.pl before credit: syntax, vocabulary, arity, safe bindings and
exactly one clause are required. Canonicalization uses the parsed head/body
term and variable numbering, preserving quoted atom content, token boundaries
and anonymous-variable distinctions. Harmless spacing and alpha-renaming are
accepted; malformed whitespace and extra clauses are not silently repaired.
Invalid predicted candidates remain in precision/exact denominators with
explicit per-item program_validations and invalid_predicted counts. NL paraphrase quality and equivalence
outside this normalizer remain unaudited. There is no automatic admission or
extracted-memory end-to-end behavior run. Full long-history distractors affect
extraction; behavior sees retained gold item source messages, not every dropped
distractor. This does not measure production retrieval under long history.

Each report retains per-call request, exact assembled messages, actual wire
body, raw provider response, Hermes result, usage, requested/effective config,
model IDs, hashes and errors. Gold journals, checker/proof outputs, source maps
and source-code snapshots accompany the report. Repaired runs also pin/hash the
installed Hermes assembly, transport and provider sources plus SDK/httpx/httpcore
sources, and record Node/Python/SWI/package versions. Each adapter verifies the
run-start runtime fingerprint before inference. Physical request/response headers are never captured. The higher-level
Codex kwargs currently include only synthetic session/request IDs as extra_headers. Generic Hermes bootstrap logs are suppressed because they may
contain unrelated private metadata.

Existing evidence:

- `reports/paired-biographies-v1/luna-full-review-v2`: completed reviewed v2
  Luna pilot, 96 behavior +24 extraction calls. Strict response counts are
  3/24,22/24,22/24,19/24; next-move component counts are 6/24,23/24,23/24,23/24.
  Extraction16/24 exact; gold memory24/24. See `RESULTS.md` and the independent
  `independent-live-audit-v2/audit-receipt.md` for the separate metrics and limits.
- `reports/paired-biographies-v1/hermes-smoke-v1`: completed Sol 8+1 integration
  diagnostic, with generic Hermes host metadata. Never pool with Luna.
- `reports/paired-biographies-v1/hermes-smoke-luna-v1`: completed Luna 8+1;
  actual wire and returned model match; exact controlled two-message prompts.
  Historical inference_calls is only a method-entry count: physical attempts
  and hidden retries cannot be retroactively certified for either old smoke.
  Behavior: no-memory 0/2, each memory condition 2/2. Extraction 0/1:
  `consent(X) -> publish(X).` is not the supported signed-Horn representation.
- `.cdd/waves/paired-biographies-v1/measurement-repair-v1.0.1.md` records the
  host-metadata repair. It changed no task policy or gold; Sol/Luna differences
  are not attributable to model choice alone.

Measurement v2 repairs beta R1–R3: the question instruction now permits an
unknown query-root question when no active definition exists and requires every
remaining plan gap to be covered by eligible questions. Gold and policy oracles
are unchanged. Extraction scoring uses the real grammar; physical-attempt guards
replace the historical method-entry assumption. Prior smoke scores remain their
original measurements, not validation of the repaired protocol. The separate
full v2 pilot ran after the independent recheck, with unchanged frozen gold.

Repaired offline evidence: `reports/paired-biographies-v1/alpha-repair-v2/`;
17 Node tests + 5 offline transport fault tests pass, all24 real gold replays
pass. Exact independent reproduction of physical fault probes:

```sh
/Users/artem/.hermes/hermes-agent/venv/bin/python world/paired-biographies/test_transport.py --report reports/paired-biographies-v1/transport-review-v2.json
```

The probes use installed Hermes + SDK with a fake HTTP endpoint: no network and
no model calls. They cover completion, connection failure, mid-stream failure,
SDK retry regression and sharing the budget across recreated clients.

P09's first-three behavior inputs are identical across variants because all
intervened distractors were dropped by the gold projection. Its behavior score
is repeated identical-input correctness; its actual distractor intervention
is measured only in extraction. Four invariance-pair totals must not be called
four measured historical behavior interventions.

These are integration smokes on one development pair. No generalization,
statistical significance, positive CDR claim, or dreaming result follows.
