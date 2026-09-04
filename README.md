# Prolog agent memory — prototype

This prototype stores immutable, sourced and time-scoped claims, then asks a
real Prolog engine to derive conflicts and their provenance.

## Run

```bash
npm install
npm test
npm run demo
```

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
memory as prompt data and cannot modify the project. Fact extraction uses the
checked-in `memory-extraction-v2` output schema and is validated again with a
Zod schema generated from the same active ontology profile before Prolog
serialization.

To use usage-based OpenAI API access instead:

```bash
export OPENAI_API_KEY="..."
npm run chat:api
```

Provider selection is explicit: `LLM_PROVIDER=codex` (default) or
`LLM_PROVIDER=openai-api`. `CODEX_BIN` may point to a non-default Codex binary,
and `CODEX_TIMEOUT_MS` controls the per-call timeout.

Set `DEBUG_MEMORY=1` to display each generated Prolog fact and conflict. Use
`/memory` inside the chat to inspect the durable journal and `/exit` to quit.

Each turn has two model calls: strict structured extraction first, then a
natural-language response grounded in the updated memory and any conflicts.
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

## Bounded rule hypotheses

`npm run elenchus -- --hypothesis FILE [--memory FILE]` evaluates one proposed
rule against explicitly named assertions in a snapshot. It emits an auditable
decision (`accepted`, `rejected`, `conflicted`, or `insufficient_evidence`) and
never writes memory or the ontology registry. A matching negative assertion is
a counterexample and prevents candidate execution. The input contract is
documented in `.cdd/waves/reflection-elenchus-v1/gamma-spec.md`.
