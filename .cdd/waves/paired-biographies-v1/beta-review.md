# Independent beta review — REQUEST CHANGES

Date: 2026-09-10. Fresh independent beta; no implementation/gold authorship,
subagents, commits, global configuration changes, remote actions or live model
calls. Review scope is local artifact readiness for a separately selected
`gpt-5.6-luna` / `openai-codex` / low development pilot. Sol remains separate.
Canonical local CDD beta and CDR beta overlay were applied within the scaffold's
explicit local-only boundary. No remote release ceremony is a blocker here.

**Verdict: REQUEST CHANGES. Fix R1–R3 before the full pilot.**
Dataset source/oracle semantics receive the per-pair verdicts in
`beta-pair-semantics.md`; human review remains pending. No memory-benefit or
research-claim approval is issued.

## R1 — P1: prompt prohibits gold-required root questions

Location: `world/paired-biographies/harness.cjs`, `BEHAVIOR_SYSTEM`.
The system says: “Questions are supported only if they fill missing premises on
a stated rule path to the query”. In p06_b, p07_b and p08_b the active snapshot is
empty, no rule path exists, and the gold next move is a direct question about
`access(iris)`, `available(saffron)` or `approve(cobalt)` respectively.

Independent replay confirms that the actual checker returns a plan with that
root literal missing and `rule_ids: []`. `world/checker.pl:133` deliberately
allows an unknown root without any defining rule. `WorldAgent.simpleChoice`
then selects the declared question. The supplied system instruction instead
forbids this valid oracle move. A compliant model can lose points, and checked
mode receives evidence favoring behavior contradicted by its own system prompt.

Repair oracle: revise and version the measurement prompt to accurately describe
root missing-literal questions as well as supported rule-body questions. Preserve
unknown versus explicit negation, question eligibility, known/conflicted-literal
exclusion and the actual policy's requirement that the remaining plan gaps be
covered by eligible questions. Keep all gold bytes unchanged. Add an independent
prompt/policy coherence test covering these three cases and a rule-chain case.
Record a measurement revision and use a fresh output directory. No full run is
necessary to validate this repair.

## R2 — P1: invalid Prolog earns perfect extraction accuracy

Locations: `harness.cjs:149-162`, `normalizeProgram` and `scoreExtraction`.
Extraction schemas only require a string for `program`. Before matching, the
normalizer removes **all** whitespace without parsing or validating the source.
On p01_a each of the following receives `exact: true`, `matched: 1`, precision=1
and recall=1:

```prolog
p u b l i s h(X) :- consent(X).
publish(X Y) :- consent(X Y).
publish(X) : - consent(X).
```

The real SWI checker independently rejects every one as `unsupported` with a
syntax error. This is a reachable false positive on model-authored candidates,
not an attack requiring gold modification. Removing whitespace changes token
boundaries and repairs malformed model output invisibly.

Repair oracle: validate the original unmodified candidate programs against the
actual signed-Horn grammar/declared vocabulary before awarding credit, and use
syntax-aware normalization that preserves atom identity, token boundaries,
variable binding and anonymous-variable distinctions. Invalid syntax/unsafe or
undeclared clauses must never count as a semantic match. Retain harmless spacing
and alpha-renaming acceptance. Regression probes must reject the three exact
strings above; include quoted atoms and malformed/extra clauses. Keep failures
and invalid predicted items explicit in score denominators. No model call needed.

## R3 — P1: counted method entry does not enforce one physical attempt

Locations: `adapter.py`, wrapper around `_run_codex_stream`; installed
`/Users/artem/.hermes/hermes-agent/agent/codex_runtime.py:1245-1378`.
The adapter increments `inference_calls` once per `_run_codex_stream` invocation.
That installed method internally sets `max_stream_retries = 1` and retries
connection failures or mid-stream failures. The wrapper's one-entry guard and
fallback override do not intercept those retries. The local config's
`max_retries: 0` does not control this hardcoded loop.

Independent offline fault injection into the **installed** transport, using a
mocked endpoint and no network, produced `adapter_inference_calls: 1`,
`physical_create_attempts: 2`, final `completed`. Therefore the report can state
one inference and no retries after multiple physical attempts, with the first
attempt absent from evidence. A mid-stream failure can discard already consumed
model work/usage and give a fresh attempt an unrecorded advantage.

Repair oracle: enforce/count at the actual transport dispatch boundary, including
SDK-level retries, so a second physical request fails before dispatch under the
one-attempt policy. Capture exact request body and per-attempt success/error at
that boundary; preserve failure/timeout evidence. Alternatively a prospective
explicit retry-policy amendment must bound, retain and report every attempt and
aggregate usage, but must stop claiming zero retries/one physical inference.
Test connection failure and mid-stream failure with controlled offline transport
faults; test that ordinary completion still records one attempt. Existing smoke
`inference_calls=1` is only a method-entry count; historical physical attempts
cannot be retroactively certified from retained artifacts.

Also pin/hash the installed adapter-dependent Hermes transport/assembly sources
and record Node/Python/SWI versions before the repaired pilot. Current run reports
snapshot project sources but omit the independently changing Hermes source that
caused this defect. Record temperature/top_p/context/output-limit availability
explicitly rather than inferring effective equality from absent wire fields.

## Independent reproduction and adversarial evidence

Evidence root: `reports/paired-biographies-v1/independent-beta-v1/`.
`clean-copy.json` enumerates the exact 13 copied source/data/test files and their
byte SHA-256 hashes. The fresh source directory is:

```text
/var/folders/l4/s779q4d12qg5l0p5rn3jnprc0000gn/T/paired-independent-beta-9x89gvs2
```

It contains the 9 production sources declared by the harness, its test file and
the 3 dataset/schema/manifest files; no repository data memory, history, gold
verification outputs or unrelated workspace content was copied. The installed
Python/jsonschema/Hermes and SWI runtimes are shared declared prerequisites,
not claimed to be rebuilt hermetically. `runtime-at-review.json` records current
versions and relevant installed runtime hashes; these do not retroactively pin
the earlier producer smoke runtime.

Executed from that clean root:

```sh
node --test world/paired-biographies/test.cjs
node world/paired-biographies/run.cjs offline --model gpt-5.6-luna --out /Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/independent-beta-v1/offline
```

Results: **13/13 tests pass; 24/24 real gold-memory replays pass**. Both processes
exit 0. `tests.txt`, `offline-command.txt`, and `offline/report.json` retain the
results; the offline report and journals contain full actual checker proofs.
No offline result is labelled model behavior or extraction evidence.

Additional independently authored probes:

```sh
node reports/paired-biographies-v1/independent-beta-v1/probes.cjs
/Users/artem/.hermes/hermes-agent/venv/bin/python reports/paired-biographies-v1/independent-beta-v1/transport-probe.py
```

`probes.json` retains the R1/R2 reproductions and **192/192 rejection checks**:
for all 24 records, wrong target, extra output field, forged proof, invalid
status, missing proof field, timeout, execution_error and failed runtime all
fail scoring. Empty summaries return zero correct/zero total, not success.
Unattempted real cases retain total=24 and not_run=24. Producer tests reproduced
independently also reject missing checked calls/receipts, wrong-case replay,
unsafe/undeclared source programs, invalid source/time/partition, hash mutation,
expired/superseded/unaccepted proof-oracle mutations, forged questions and IDs.
`transport-probe.json` contains R3's separate offline fault-injection result.
The synthetic transport response is explicitly a test stub, never Hermes model
behavior or extraction evidence.

## Actual Luna input isolation and settings

`luna-wire-audit.json` independently inspects all nine retained Luna adapter
artifacts, not just constructor flags. All 9 have exact frozen expected system
and user messages, exact wire `instructions` and the one expected user `input`,
no tools, Luna wire and returned model identities, and low reasoning effort.
All 9 have distinct session IDs, process IDs and temporary homes/workdirs.
No pair/category/oracle labels, old-other-variant, private profile, repository
path, date/host instructions or history were present in those actual inputs.
The adapter source in the Luna run snapshot exactly matches the reviewed adapter.
The frozen whitelist excludes evaluator-only fields in the first three lanes;
checked mode alone contains the real replay result and query/snapshot receipt.

Observed settings: requested `max_tokens=4096`, low reasoning; wire
`reasoning={effort:low,summary:auto}`; no `max_output_tokens`, temperature or
`top_p` field; effective context ceiling unavailable. Effective output token cap
is correctly recorded null. Outer 120-second wall timeout and 8 MiB artifact
bounds exist, but they do not establish a 4096-token budget. Provider effective
sampling defaults are unavailable. The wire timeout 1800s is superseded locally
by the outer process deadline. Physical attempts are not proven by the retained
method-entry count (R3). No additional live call was necessary for this review.

## Measurement layers and remaining limitations

- Extraction receives the complete dialogue and emits only candidates; it is
  separately scored. No runtime automatically admits those results. R2 affects
  its measurement, not the independently loaded gold-memory layer.
- Memory loads accepted gold through real observe/propose/admit and journal
  projection; candidates remain proposals. Inclusive expiry and explicit
  supersession use actual world machinery. Gold receipts contain complete
  actual raw/safe closures, proofs and source remappings. The first-three system
  definitions of raw conflict and conservative safe-proof taint match the
  checker: conflict is computed from raw closure and cannot be erased by a
  clean alternative when the literal itself has a raw opposite. An independent
  path survives only where its literals are unconflicted, as in p04.
- Behavior uses a fresh installed AIAgent with injected gold memory. Checked
  evidence is supplied by the host after an actual checker run; this does not
  measure spontaneous tool selection. Matching receipt IDs binds the output to
  that supplied receipt. Ordinary model-output proof forgery cannot replace the
  real replay performed by `run.cjs`. The exported scorer is not a cryptographic
  validator for arbitrary externally fabricated JavaScript replay objects.
- **L1, p09 coverage limitation:** the two variants' first-three behavior inputs
  are byte-identical, because all 28 intervened distractors are dropped before
  behavior projection. Their extraction inputs do differ. Thus p09 measures
  distractor-order invariance only in extraction; behavioral pair success is
  repeated identical-input correctness, not behavioral robustness to that
  intervention. This limitation is already declared by alpha and does not
  invalidate the gold, but must remain explicit beside any category results.
  The four behavioral invariance-pair total must not be described as four
  measured historical interventions. No production long-history retrieval is
  tested.
- No-memory is scored against the historical full-information oracle while
  unavailable proof IDs cannot be cited. That is a deliberate information-loss
  control, not a pure reasoning-quality comparison. All modes measure the same
  full-information target, with intentionally unequal accessible knowledge.
- Strict authored proof sets are adequate for these unambiguous gold proofs;
  general alternative-proof equivalence and NL paraphrase semantics remain
  unmeasured. No general benchmark validity, statistical inference, production
  provider validation, dreaming result or extracted-memory end-to-end claim.

The dataset is synthetic and manifest-hashed; no real-person source or external
paper-derived empirical claim was used. Falsifiability and diagnostic review
found R1–R3, clean reproduction succeeded, data-policy boundaries are retained,
and claims remain bounded to local development. CDR memory benefit stays
indeterminate. R1–R3 need alpha repair and fresh beta recheck before the full
Luna pilot; no gold change is required by this review.

## Subsequent repair recheck v2 — APPROVE (2026-09-10)

The original REQUEST CHANGES above is preserved as the v1 review. Alpha's v2
repair was independently rechecked: R1–R3 are closed and the repaired local Luna
pilot is ready. See `beta-review-v2.md` for the complete current verdict, exact
clean-copy commands and additional independent boundary probes. Results:
17/17 Node tests, 5/5 transport fault tests, 24/24 gold replays; gold unchanged;
no beta live calls. Human review/p09/research-claim limitations remain unchanged.
