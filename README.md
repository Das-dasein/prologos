# Prolog agent memory — prototype

This prototype stores immutable, sourced and time-scoped claims, then asks a
real Prolog engine to derive conflicts and their provenance.

## Agent world PoC

`npm run world:demo` runs a persistent single-agent episode in two histories:
old memory changes whether the agent asks about a backup or requests release.
The report includes both conditional dream branches, proof provenance, a
missing-premise control and continuation after restart. `npm run test:world`
checks its lifecycle and reasoning boundaries. See [world/README.md](world/README.md)
for the CLI, model interpretation, explicit admission and full-Prolog thought.
This is a synthetic engineering PoC; it does not establish a benefit of dreaming.
The [working domain decision](.cdd/proposals/domain-selection-v0.md) keeps the
core neutral, uses DataCite as the current lineage control, selects OSV advisory
reconciliation for the next applied experiment, and retains synthetic FHIR
patient records as a later review-only transfer test.

The development Hermes installation can use this world as the active external
memory provider through `integrations/hermes/prolog_world`. Completed turns are
recorded as sourced history, while only separately admitted Prolog proposals
enter the executable snapshot. See [integrations/hermes/README.md](integrations/hermes/README.md)
for the provider boundary and its three tools.
The first installed-runtime result is recorded in
[reports/hermes-memory-autonomous-v0/README.md](reports/hermes-memory-autonomous-v0/README.md):
two fresh Hermes sessions autonomously queried different old histories and
selected `ASK backup_ready` versus `ACT release` for the same current question.
The stronger [open-choice run](reports/hermes-memory-open-v1/README.md) removes
the action vocabulary and tool name from the prompt; Hermes independently
formulates the Prolog query and chooses to seek evidence or proceed.

The newer [autonomous Prolog tool evaluation](reports/autonomous-prolog-tool-v5/luna-full-v1/RESULTS.md)
tests that behavior across 16 frozen signed-Horn snapshots. With only the tool
available, Luna selected it in 9/16 cases; all nine calls used the correct
primary query and all nine final answers were exact. In the seven skipped cases,
exact provenance was 0/7. Requiring one call removed all status errors, but six
of 25 correct primary receipts across optional and guided use were corrupted
while the model extracted or copied long support lists. This is a bounded
system/tool-interface result, not evidence of general Prolog advantage.

The follow-up [receipt transport ablation](reports/prolog-receipt-transport-v6/luna-full-v1/RESULTS.md)
kept the prompt, query, solver, tool schema, model and call count fixed. Returning
the existing raw checker result gave 11/16 exact provenance answers; a local
target-only projection gave 15/16, while status remained 16/16 in both. The
compact receipt averaged 512.75 bytes instead of 64,019 and used about 80.9%
fewer recorded total tokens. The paired exact difference had `p = 0.125`, so it
is an engineering direction rather than a general statistical claim.

## Run

```bash
npm install
npm test
npm run demo
```

The canonical runtime is SWI-Prolog (selected by default through
`prolog-engine.js`). Set `PROLOG_ENGINE=tau` only for compatibility experiments
with the legacy JavaScript interpreter. `SWIPL_BIN` may point to a specific SWI
binary.

## Talk to the agent

The default provider is Codex CLI, so a ChatGPT/Codex subscription can be used
without creating an API key:

```bash
# Install Codex CLI on macOS/Linux (skip if already installed)
curl -fsSL https://chatgpt.com/codex/install.sh | sh

codex login
codex login status
npm run chat
```

Codex CLI is invoked in non-interactive, ephemeral, read-only mode. It receives
memory as prompt data and cannot modify the project. Product fact extraction
uses the checked-in `memory-extraction-v5` output schema, including exact
ontology and grounding-policy identities plus a verbatim source span for every
assertion, and is validated again with a
Zod schema generated from the same active ontology profile before Prolog
serialization.

To use usage-based OpenAI API access instead:

```bash
export OPENAI_API_KEY="..."
npm run chat:api
```

Provider selection is explicit: `LLM_PROVIDER=codex` (default) or
`LLM_PROVIDER=openai-api`. `CODEX_BIN` may point to a non-default Codex binary,
`CODEX_TIMEOUT_MS` controls the per-call timeout, and `CODEX_MODEL` pins the
Codex model recorded in admission receipts. Without that pin the Codex model
field is retained as `null` rather than guessed.

Set `MEMORY_REPAIR=1` to enable one bounded validator-feedback call when a
schema-valid extraction still violates a source-level invariant. The current
product validator checks temporal interval order, verbatim evidence spans for
assertions and ontology candidates, and duplicate candidate names. It also
rejects any repair that changes fields outside the reported diagnostics. Every
primary candidate, attempted repair and explicit admission event is appended to
`data/extraction-admission.jsonl` by default; set
`MEMORY_ADMISSION_AUDIT_FILE` to choose another receipt file. Receipts include
the source message so evidence checks can be replayed; the file is created with
owner-only permissions (`0600`) and must be handled as private conversation
data.

No model-produced extraction is appended to Prolog memory automatically. Use
`/candidate` to inspect the pending candidate and its content hashes, then
`/admit` to approve that exact receipt. This applies equally to clean
first-pass output and bounded repair output. Reusing an already admitted
receipt is rejected when the admission ledger is available. This product path
uses the repository's `memory-extraction-v5` contract; it does not copy the
separate signed-Horn experiment implementation.

The v5 contract makes the extraction disposition explicit: `write`, `ignore`,
`clarify`, or `ontology_candidate`. A `clarify` result contains a bounded
question and a verbatim ambiguous span, and cannot contain an assertion. An
`ignore` or ontology-only result cannot be admitted as a memory write. These
cross-field rules are checked again locally before a receipt is created.

The older `memory-extraction-v2` and `memory-extraction-v3` contracts remain
available for frozen research harnesses and direct legacy imports. Product
admission rejects a v2 candidate containing assertions because it lacks
assertion-level evidence. A verbatim
span proves textual provenance only; explicit admission remains the trust
boundary for whether the normalized predicate and arguments preserve meaning.

Set `DEBUG_MEMORY=1` to display each generated Prolog fact and conflict. Use
`/memory` inside the chat to inspect the durable journal and `/exit` to quit.

Each normal turn has two model calls: strict structured extraction first, then
a natural-language response grounded in the currently admitted memory.
An enabled repair adds at most one call after a rejected extraction.
The model never writes raw Prolog. `ontology/active-profile-v1.json` selects a
versioned universal-core layer plus explicit domain layers. That profile
generates the prompt and provider validators; `memory-store.js` checks its exact
content-addressed identity again before serializing an assertion with separate
qualifiers. This prevents stale output, arbitrary predicates, or executable
Prolog from entering the trusted program.

Unknown durable vocabulary may be returned only as an untrusted ontology
candidate with a verbatim evidence span. Candidates are diagnostic data: they
are never appended to Prolog memory or registry files. Run
`node ontology-registry.js` to inspect the active profile identity and its
core/domain projection.

The first [live product-v3 smoke](reports/product-extraction-v3-smoke-v2/RESULTS.md)
retains one failed pre-output schema attempt and one successful pinned Luna
call. The successful candidate extracted two registered facts from a Russian
message with exact evidence spans, passed local replay, and performed zero
admission writes. This verifies the live schema and quarantine path for one
easy case; it is not an extraction benchmark.

The follow-up [nine-case v3 extraction diagnostic](reports/product-extraction-v3-eval-v1/RESULTS.md)
scored 8/9 exact semantic cases, with 6/7 assertion precision and 6/6 recall.
All candidates passed the original textual validator, including one incorrect
resolution of `They` to `alex`. The product validator now rejects that specific
ungrounded pronoun-subject pattern. Its 8/9 post-hoc replay is diagnostic only;
a fresh control set is still required to test whether the rule generalizes.

That [fresh 12-case control](reports/product-extraction-validator-v2-control-v1/RESULTS.md)
found the intended safety effect and a usability failure. Validator v2 blocked
both ambiguous pronoun writes, but also blocked both correct single-antecedent
pronoun assertions. It produced zero eligible harmful writes in this control,
yet it is too conservative to count as a coreference resolver.

An `unresolved_pronoun_subject` now produces `clarification_required` rather
than a repair attempt or a silent drop. The chat asks for an explicit person in
the source language, performs no admission write, and skips the ordinary
answering call for that turn. This keeps the safety behavior while making the
false-rejection cost visible to the user.

The product provider previously emitted the versioned v4 disposition contract.
That historical path remains replayable and covered by deterministic tests. A
[one-call live smoke](reports/product-extraction-v4-smoke-v1/RESULTS.md) accepted
the v4 schema and returned `clarify` with zero writes for one frozen ambiguous
pronoun case. This checks transport and the safety boundary, not extraction
quality. The conservative v2 pronoun validator remains a fallback for a
model-proposed `write`; therefore v4 does not yet establish selective
coreference resolution.

The fresh [16-case v4 control](reports/product-extraction-v4-eval-v1/RESULTS.md)
originally scored 15/16 exact decisions. A later
[grounding-policy audit](reports/predicate-grounding-policy-v1/RESULTS.md) found
that the disputed `I mentor junior developers → role(user,mentor)` label was not
specified by the ontology. Policy v1 licenses that lexical role entailment, so
the post-hoc policy score is 16/16. Validator v2 separately blocked both correct clear-antecedent
pronoun writes. A validator-v3 replay removes those two false blocks on this
wave and the earlier 12-case control, but it was designed after observing the
outputs and remains a post-hoc candidate pending a fresh control.

The subsequent [fresh coreference control](reports/product-extraction-v4-coref-control-v1/RESULTS.md)
falsified that candidate as an admission gate. Validator v3 admitted one newly
eligible candidate containing unsupported `works_at(leila, team)` and mistook
the organization `Acme` for a second possible person antecedent. Luna safely
chose `clarify` for all eight truly ambiguous or missing-antecedent cases, but
also over-clarified two of four clear antecedents. Product admission therefore
retains validator v2 for coreference. The later admission-policy v1 adds only
the independently tested identity-normalization gate. Predicate-level semantic
grounding remains separate, especially preventing nearby registered relations
from absorbing unsupported activities or events.

The experimental [memory-grounding review](reports/memory-grounding-review-v1/RESULTS.md)
adds a separate hash-bound CDR judgment for each quarantined assertion. On 16
retrospective assertions its original gold score rejected three proposed
predicate mappings, but a later policy audit showed that one `mentor→role`
rejection was an annotation-contract error. It also incorrectly accepted both ambiguous pronoun bindings.
Validator v2 showed the complementary failure pattern. Their conjunction
blocked all five harmful candidates while retaining 6/8 clean candidates on
this set. The review has no admission authority and is not yet in the product
path; a fresh extraction-plus-review control is required.

That [fresh end-to-end control](reports/extraction-grounding-e2e-v1/RESULTS.md)
completed 12 extraction calls and six conditional reviews. Extraction chose all
12 expected dispositions; after a separately recorded transliteration
adjudication, its assertions and all six review verdicts were exact. No harmful
write candidate occurred, so the wave cannot confirm an incremental safety
benefit from review. The hybrid still blocked two correct clear-pronoun writes
because validator v2 remains conjunctive. Semantic review therefore stays out
of product admission until a fresh control contains informative extraction
errors and shows a net gate improvement.

Predicate judgments now have an explicit
[grounding policy](reports/predicate-grounding-policy-v1/RESULTS.md), separate
from the ontology signature. Review-v2 binds its output to that policy hash as
well as the extraction candidate hash. A
[one-call live smoke](reports/memory-grounding-review-v2-smoke-v1/RESULTS.md)
confirmed the schema and policy identity on the corrected `mentor→role` case.
The subsequent
[24-case policy control](reports/memory-grounding-review-v2-policy-control-v1/RESULTS.md)
scored 24/24 verdicts and gates, with zero harmful passes, zero blocked entailed
assertions, and the expected `uncertain` result for one unadmitted
transliteration. This shows that Luna can follow the frozen policy on a small
hand-authored set whose negative cases closely mirror its explicit exclusions.
It does not measure extraction quality or incremental product benefit;
review-v2 remains outside product admission.

The `memory-extraction-v5` contract carries the same exact policy identity and
includes the policy in the extraction prompt. In a
[fresh 20-case paired control](reports/product-extraction-v4-v5-paired-control-v1/RESULTS.md),
v5 improved exact cases from 11/20 to 19/20 with no paired regression. Most of
the gain was better disposition: three useful writes replaced v4
over-clarifications and five one-time events became `ignore` instead of
quarantined ontology candidates. Both versions still wrote the same unadmitted
transliteration, so raw harmful writes remained 1 in each condition. A
deterministic identity check removes that write in a post-hoc replay with no
correct write blocked on this set, but it was authored after the result. A
subsequent [fresh Russian identity control](reports/product-extraction-v5-identity-control-v1/RESULTS.md)
showed why the deterministic layer is necessary: v5 wrote 5/6 unadmitted
identity normalizations, while the frozen gate blocked all five and passed all
ten correct writes, including translated role and common-concept arguments.
The final gate score was 16/16 with zero harmful eligible writes and zero
correct writes blocked. The gate first became active for product v4 through
[admission policy v1](reports/extraction-admission-policy-v1/RESULTS.md). Product
extraction now defaults to v5 for both Codex and OpenAI providers, including the
repair path, under
[admission policy v2](reports/extraction-admission-policy-v2/RESULTS.md). Receipt
v2 binds either the v4 policy-v1 identity or the v5 policy-v2 identity and
replays that exact policy; receipt v1 retains legacy validator-v2 replay. Every
write still requires explicit admission. This activation uses the measured v5
disposition gain together with the deterministic identity gate; it does not
claim that v5 alone improved raw write safety.

A subsequent [fresh product-path smoke](reports/product-extraction-v5-product-smoke-v1/RESULTS.md)
sent `Я знаю Python.` through the current Codex provider with pinned
`gpt-5.6-luna`. The returned v5 candidate carried both required identities,
passed the active deterministic policy, and produced a policy-v2 receipt with
status `primary_proposed_unadmitted`. The smoke made one provider call and zero
memory writes. This verifies the activated transport and quarantine path for
one easy case; it is not an extraction-quality result.

Run an arbitrary query:

```bash
node cli.js demo.pl "conflict(Type, A, B, Subject)."
```

Memory assertions have a constrained core plus separate qualifiers:

```prolog
assertion(Id, Proposition).
assertion_polarity(Id, positive_or_negative).
assertion_modality(Id, asserted_or_reported_or_questioned_or_uncertain).
assertion_time(Id, interval(From, To)).
assertion_source(Id, Source).
assertion_confidence(Id, Confidence).
```

`Polarity` is `positive` or `negative`; `ValidTo` may be `inf`. The system
detects explicit positive/negative clashes and competing values of relations
declared with `functional/1`.

The current LLM boundary is narrow: a model may propose typed assertion fields, but
must not rewrite the trusted rules in `memory.pl`. The planned CDD extension
allows bounded, JSON-encoded rule proposals; those rules are validated,
compiled into an isolated candidate ontology and executed by SWI-Prolog. See
`.cdd/ontology-mvp-v0.md`.

The isolated rule-hypothesis harness still uses `ontology-registry-v1.json` as
its separate executable candidate baseline. A proposal may carry an explicit
registry for an isolated domain extension; it cannot shadow reserved runtime
predicates. This candidate registry is not the active chat-ingestion profile,
introduces no facts, and is not a substitute for dialogue-derived memory.

## Deterministic answer after semantic execution

For the finite object-FOL evaluator, `labelled_benchmark_answer/3` is the
answer boundary: `entailed` produces `A`, `contradicted` produces `B`, and
`unknown` produces `C`. `invalid_program` and `conflict` remain unresolved;
they are never silently converted into `C`. Thus a model can supply an
immutable candidate program and query, while SWI-Prolog supplies the final
benchmark label and its certificate.

The frozen 30-case Luna development run was re-executed through this boundary
with no model calls. It produced 17/30 matches with the original ProverQA
gold, identical to the earlier M2 condition in which Luna read the executor
output. The reviewable artifact is
`.cdr/waves/luna-thirty-prolog-answer-v1/raw-prolog-answer-v1/dashboard.html`.
This demonstrates that M2 mostly transcribed the solver status; it does not
establish general accuracy of model-led formalization. A post-hoc audit found
that several mismatches depend on a hidden source XOR whose meaning conflicts
with the visible English text, so this development score combines
formalization fidelity with compatibility with that dataset contract.

## Current controlled findings

The next frozen wave combines the two previously separated difficulties:
[`temporal-reasoning-stress-v1`](world/temporal-reasoning-stress/README.md)
contains 36 journal-backed cases with 3, 5 or 8 inference steps, chain or join
topology, fact or rule revision, dependent copies, withdrawal/replacement and a
real process restart. In the verified 108-call Luna run, canonical exact scores
were P0 33/36, P1 34/36 and P2 36/36. Both P1 errors had the correct status and
support set in the wrong order, so semantic status-plus-support accuracy was
36/36 in both P1 and P2: this wave does not show a solver reasoning increment.
See the [full result](reports/temporal-reasoning-stress-v1/RESULTS.md).

`reasoning-stress-v1` freezes 32 generated signed-Horn worlds across depth,
conjunction and four epistemic statuses. A verified 96-call Luna run scored
P0 natural language 31/32, P1 equivalent formal memory 32/32 and P2 formal
memory plus checker receipt 32/32. The single P0/P1 difference is insufficient
for a representation claim, and P1→P2 shows no solver increment because P1 is
already at ceiling. See
[`reports/reasoning-stress-v1/RESULTS.md`](reports/reasoning-stress-v1/RESULTS.md)
and reproduce the evidence audit with:

```sh
node world/reasoning-stress/verify-report.cjs reports/reasoning-stress-v1/luna-full-20260913-v1
```

The follow-up
[`provenance-decision-stress-v2`](reports/provenance-decision-stress-v2/RESULTS.md)
avoids that ceiling with 24 SWI-checked downstream decisions. Its verified
72-call Luna run scored exact decision plus provenance at P0 16/24, P1 16/24,
and P2 22/24. The paired P1→P2 exact cells contain six P2-only improvements and
no P1-only regression (`p=0.03125`, two-sided exact McNemar). The gain is in
canonical fact-source-group support: decision-only accuracy changed from P1
24/24 to P2 22/24. Thus the receipt improved exact provenance output on this
bounded wave but did not improve `act/ask/pause` selection. All 72 calls were
runtime-valid with retained raw evidence, no retry, and no tools.

That result now has a product-side consequence: `WorldAgent` can enforce the
versioned `independent-fact-support-v1` host policy for a declared goal. With
`actionPolicy: { minIndependentFactSupportPaths: 2 }`, a safely entailed query
licenses `act` only when the checker returns two proof paths with disjoint
declared `fact_source_group_ids`; otherwise the host pauses with
`insufficient_independent_fact_support`. Rule-source groups and distinct item
IDs cannot satisfy the threshold. The default remains the earlier safe-proof
policy unless a goal explicitly selects this stronger threshold. A deterministic
support-selector replay matches all 24 frozen decision-stress oracles under that
benchmark's `ask` mapping. `WorldAgent` instead pauses when the provenance
threshold is unmet, so this is not a full agent-equivalence check or new evidence
about model quality or real source independence.

The stricter `independent-host-attested-fact-support-v2` policy closes the
obvious self-splitting path. A source event now owns both its group and its
assurance; candidate items cannot override either field. A group string alone
is `host_declared`; it becomes `host_attested` only with a journaled
`source-group-attestation-v1` authority and reason. Ordinary model-created or
ungrouped events are `event_local`. Strict decisions count only host-attested fact groups,
so repeating and admitting two model proposals cannot manufacture the two
sources required for action. Older journal items without this field remain
`legacy_unspecified` and do not gain trust retroactively.

Hermes now injects the stronger
`independent-host-attested-lineage-support-v3` policy. A host attestation may
record a stable `lineage_id` for the earliest common origin the connector can
establish. Two separately attested publishers that repeat the same upstream
report therefore do not satisfy the diversity threshold; missing lineage also
causes a pause. This enforces known lineage metadata only. It does not discover
hidden copying, collusion, source quality, or truth. See the
[v3 design](.cdd/designs/source-lineage-policy-v3.md).

Assertion-level dependency is now explicit and separate from source lineage. An
accepted item can name previously admitted items in `dependsOn`; snapshot
projection removes it transitively when a named premise is replaced, expired or
otherwise inactive. A shared lineage alone does not create that edge. See the
[dependency invalidation contract](.cdd/designs/assertion-dependency-invalidation-v1.md).

The corrected frozen deterministic
[`provenance-policy-ablation-v2`](reports/provenance-policy-ablation-v2/RESULTS.md)
exercises 11 authored scenarios across the default safe-proof decision and
policies v1/v2/v3. All 44 expected cells replay exactly. The transitions isolate
the recorded condition each layer adds: group duplication is blocked by v1,
unattested self-splitting by v2, and a known common origin or missing lineage by
v3. V2 corrects a v1 conflict receipt whose safe status could not be produced by
the real checker and tests the corrected raw-conflict ordering against that
checker. These remain synthetic contract tests, not estimates of model accuracy
or real-world attack prevalence.

The first metadata-backed intake is now implemented for DataCite. The bounded
connector follows explicit DOI `IsVersionOf`, `IsNewVersionOf`, `IsDerivedFrom`,
`IsVariantFormOf`, `IsTranslationOf`, and `IsIdenticalTo` relations, stores each
exact API record
under its SHA-256, and supplies the resulting group, lineage and receipt hash to
the existing journal. A frozen live intake followed 13 DataCite schema-document
versions to one recorded root and retained one unrelated Dryad DOI as a distinct
root. In the journal→checker→policy replay, v2 acted on two different version
DOIs while v3 paused because their recorded lineage was shared; both acted for
the distinct roots. The Prolog carrier fact was deliberately synthetic, so this
is external-metadata plumbing evidence rather than semantic or utility evidence.
See the [intake result](reports/datacite-lineage-intake-v1/RESULTS.md).

The first OSV adapter pilot retains two real advisory records for
`npm:lodash@4.17.21`, evaluates their SemVer ranges, and keeps vulnerability
identity separate from entry lineage. The records disagree, so the real
journal→checker→decision path returns `pause / goal_conflicted`; exact replay
uses the retained response bytes. This is one exploratorily selected metadata
conflict, not a package-safety verdict or an accuracy estimate. See the
[pilot result](reports/osv-advisory-conflict-pilot-v1/RESULTS.md) and the
[preregistered revision experiment](.cdr/waves/osv-revision-dependency-v1/protocol.md).
Its selector, four-system runner and pre-run source manifest are implemented in
[`world/osv-revision-dependency`](world/osv-revision-dependency/README.md); the
24-case fixture is collected only after that source freeze.

The separate bounded extraction-repair wave gives deterministic signed-Horn
validation errors back to Luna once. Seven of eight failed first-pass cases
became exact, moving the assisted result from 16/24 to 23/24 and reducing
invalid programs from 16 to zero. The remaining error is a validity-interval
and replacement-topology mistake. A separate provenance validator identifies
that unsupported endpoint without gold, and one qualifier repair reaches an
assisted 24/24. This is assisted recoverability, not a revised first-pass
score. See the [syntax repair](reports/paired-biographies-v1/luna-extraction-repair-v2/RESULTS.md)
and [qualifier repair](reports/paired-biographies-v1/luna-qualifier-repair-v1/RESULTS.md).

Replaying the retained candidates through the actual journal, per-item
validation, explicit-user admission, active snapshot, checker and deterministic
next-step policy produces 17/24 correct decisions from first-pass extraction
and 24/24 after bounded repair. Seven stored episodes change to the authored
decision. This is a fixed synthetic replay, not a fresh dialogue run; see the
[extracted-memory E2E result](reports/paired-biographies-v1/extracted-memory-e2e-v2/RESULTS.md).

## Bounded rule hypotheses

`npm run elenchus -- --hypothesis FILE [--memory FILE]` evaluates one proposed
rule against explicitly named assertions in a snapshot. It emits an auditable
decision (`accepted`, `rejected`, `conflicted`, or `insufficient_evidence`) and
never writes memory or the ontology registry. A matching negative assertion is
a counterexample and prevents candidate execution. The input contract is
documented in `.cdd/waves/reflection-elenchus-v1/gamma-spec.md`.
# Bounded Matrix A/B pilot

The pilot is fake-provider deterministic by default and runs each case in an
isolated Prolog program. It never writes `memory.pl` or `domain-rules.pl`:

```sh
npm run pilot -- --condition B4 --output /tmp/pilot-b4.json
npm run test:pilot
```

Use B1--B4 for extraction conditions. B5 is the gold ceiling. A live provider
requires explicit `--allow-live-provider=true` and `--raw-output-dir DIR`.
Fake results establish harness determinism only; they do not support a memory
utility or superiority claim.
