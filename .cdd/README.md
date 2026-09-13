# CDD: LLM-built Prolog ontology

CDD describes the product implementation. CDR separately evaluates whether
the implementation improves agent answers.

Current wave: `ontology-mvp-v0`.

Exploratory foundation: [`agent-epistemology-v0.md`](agent-epistemology-v0.md)
records the proposed philosophical model for shared ontology, agent memory,
reflection, critical review, identity and Git provenance. It is not yet a
runtime contract and does not supersede the current wave specification.

Assembly proposal: [`designs/agent-world-v0.md`](designs/agent-world-v0.md)
connects that philosophical world to one agent's proposed life cycle, maps the
existing components and their integration gaps, and outlines a first episode.
It is a design proposal, not a completed runtime or research result.

Assertion lifecycle contract: [`assertion-lifecycle-v1.md`](assertion-lifecycle-v1.md)
defines the bounded status transitions used by the current assertion runtime.

Provenance decision contracts:
[`source-group-assurance-v2.md`](designs/source-group-assurance-v2.md) defines
host attestation and source-event binding; its successor
[`source-lineage-policy-v3.md`](designs/source-lineage-policy-v3.md) requires
disjoint recorded upstream lineages for the strict Hermes action threshold.
