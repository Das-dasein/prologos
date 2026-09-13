# Hermes integration

`prolog_world` is a Hermes `MemoryProvider` adapter. Hermes owns the conversation and tool loop; the existing Node/Prolog world owns the append-only journal, accepted knowledge, conflict semantics, proof traces, and read-only conditional execution.

The adapter deliberately records completed Hermes turns as source events only. `world_memory_propose` can create a candidate, but the model has no admission tool. Admission remains a separate operation with a named authority and reason:

```bash
node world/hermes-bridge.js <<'JSON'
{"action":"admit","directory":"/path/to/world","proposal_id":"proposal_1","by":"operator","reason":"Reviewed against the cited source"}
JSON
```

For a local development install, link `integrations/hermes/prolog_world` into `$HERMES_HOME/plugins/prolog_world`, create `$HERMES_HOME/prolog-world.json`, and select `memory.provider: prolog_world`. The supplied `release-domain-v0.json` is only the narrow H1/H2 experimental projection; it is not a universal ontology.

With `auto_reflect: true`, the provider uses Hermes' active model once at a
session boundary. It reads user messages only and records the exact
instructions, input, raw output, model, usage, and input hash. Empty results and
candidate proposals are journaled; neither is admitted automatically. The input
hash prevents the same transcript from being reflected twice.

Provider tools:

- `world_memory_query`: deterministic query with proof and conflict trace; its audit receipt is appended without changing the knowledge snapshot.
- `world_memory_decide`: accepts a declared simulated goal and runs the host
  `WorldAgent` safe-policy. It returns the host's `act`/`ask`/`pause` decision
  but never executes an external action; Hermes can explain or relay it, not
  replace it with a model-derived choice. Set
  `"decision_min_independent_fact_support_paths": 2` in
  `$HERMES_HOME/prolog-world.json` to make the provider inject a trusted host
  threshold; the model cannot omit it from the goal. The host then pauses unless
  safe proof contains two host-attested paths with disjoint recorded source
  lineages.
  Model-created and ungrouped events remain `event_local`; only the host-side
  bridge API can attach the required `source_group_attestation` receipt with
  `by`, `reason`, and `lineage_id`. Different groups carrying the same lineage
  do not satisfy the configured v3 threshold; missing lineage also pauses.
- `world_memory_propose`: source plus candidate fact/rule; no admission.
- `world_memory_dream`: temporary assumptions with an audit receipt; the assumptions never enter the knowledge snapshot.

Run the two-session live control with:

```bash
npm run experiment:hermes-live -- reports/hermes-memory-run guided
npm run experiment:hermes-live -- reports/hermes-memory-autonomous autonomous
npm run experiment:hermes-live -- reports/hermes-memory-open open
```

The harness temporarily selects each isolated world in `prolog-world.json` and
restores the original file in a `finally` block. `guided` requires the Prolog
query. `autonomous` supplies only the goal and two action choices; whether to
query memory and how to choose remains with Hermes.
`open` removes the action vocabulary as well: only the situation and goal remain.
