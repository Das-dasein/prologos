# CDD wave: reflection-elenchus-v1

## Objective

Turn a proposed bounded rule into an auditable hypothesis decision without
changing durable memory or the shared registry.

## In scope

- strict hypothesis record and registry identity;
- deterministic support and counterexample inspection over a pinned memory
  snapshot;
- `accepted`, `rejected`, `conflicted`, and `insufficient_evidence` decisions;
- isolated execution only after Elenchus admits the candidate;
- focused positive, counterexample, superseded-support, malformed, and
  deterministic-repeat tests.

## Out of scope

- LLM generation quality, autonomous registry mutation, human governance,
  UI, scheduling, embeddings, CDR measurements, or a claim that consistency is
  truth.

## Definition of done

- every result includes registry identity, source snapshot hash, supporting and
  refuting assertion IDs;
- a known negative case prevents candidate execution;
- unsafe/superseded support cannot justify a rule;
- accepted execution uses the existing disposable ontology runner;
- trusted memory bytes remain unchanged;
- repository and CDR gold checks remain green.
