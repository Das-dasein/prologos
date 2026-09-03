# Wave manifest: prolog-memory-eval-v0

- Protocol: `cnos.cdd.cdr.receipt.v1`
- Opened: 2026-09-03
- Coordination: delta equals gamma for this small project wave
- Actor floor: alpha and beta are separate fresh sessions
- Trigger: initial selection of PAM-C1 from the open-claim ledger
- Project policy: `.cdr/POLICY.md`

## Research gap

The project has runnable smoke tests and a conceptual evaluation plan, but no
pre-registered method that can separate:

1. correctness of the deterministic symbolic layer given gold claims;
2. correctness of LLM dialogue-to-claim formalization;
3. usefulness of Prolog-backed memory in final answers relative to baselines.

Without that separation, a successful Prolog query can be mistaken for useful
agent memory, while a bad extraction can be mistaken for a Prolog failure.

## Wave question

Can a bounded evaluation protocol and pilot dataset make PAM-C1 through PAM-C4
falsifiable without changing thresholds after results are observed?

## Candidate claim status

All PAM claims remain `hypothesized`. This wave may transmit only a claim about
the adequacy of the evaluation method, not a claim that the memory architecture
works.

## Alpha matter

Alpha must produce:

- `.cdr/methods/prolog-memory-evaluation-v1.md`;
- `.cdr/datasets/dialogues-pilot-v1.jsonl` with exactly 12 synthetic dialogues;
- `.cdr/datasets/dialogues-pilot-v1.manifest.md` with origin, license/use,
  schema, case taxonomy, and SHA-256;
- `.cdr/results/prolog-memory-eval-v0/pilot-oracle.json` containing expected
  memory operations, active states, conflict states, and query answers;
- `.cdr/waves/prolog-memory-eval-v0/alpha-report.md` mapping every design choice
  to PAM-C1 through PAM-C4 and naming unresolved limitations.

The 12 cases must include two examples of each:

- stable recall;
- explicit correction/supersession;
- temporal change without contradiction;
- direct positive/negative conflict;
- non-memory content: question, hypothetical, quotation, or uncertainty;
- alias/coreference ambiguity.

## Data refs

- `.cdr/datasets/source-snapshot-f8796ab.manifest.md` plus
  `.cdr/datasets/source-snapshot-f8796ab.sha256` — current implementation
  snapshot, pinned to commit `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`;
  local source files only.
- `.cdr/datasets/source-snapshot-2026-09-03.*` — historical initial snapshot;
  retained for provenance, not used as the current source identity.
- `.cdr/datasets/dialogues-pilot-v1.manifest.md` — alpha-produced synthetic
  dataset manifest.

`data/memory.pl` is deliberately excluded because project policy classifies it
as local exploratory state that may contain personal information.

## Method refs

- CDR doctrine: `usurobor/cnos@fb527e6c`,
  `src/packages/cnos.cdr/skills/cdr/CDR.md`.
- Project method deliverable:
  `.cdr/methods/prolog-memory-evaluation-v1.md`.
- Existing smoke command: `npm test`.

Any software harness required beyond existing commands is out of this research
wave and must be produced as separately pinned CDS evidence.

Repair binding: the CDR method may consume a CDS harness only through an
immutable path plus commit/archive identifier. No such harness existed at
R1; its absence is recorded as a method-executability limitation, not filled
by this research session.

## Diagnostic oracles

- Gold-claim oracle: inject expected claims without an LLM and require exact
  active state, conflict status, and provenance.
- Extraction oracle: compare proposed memory operations against per-turn gold
  operations; score write decision separately from field accuracy.
- End-to-end oracle: ask fixed questions after controlled dialogue histories;
  score stale/contradictory fact use separately from general answer quality.
- Leakage sentinel: one intentionally easy pilot case must fail if gold claims
  are accidentally exposed to the model condition.
- Budget sentinel: reject comparisons whose effective context budgets differ.

## Beta review oracle

Beta independently checks:

- every PAM claim has an observable falsifier;
- the 12 cases cover all six registered categories exactly as declared;
- expected outputs were authored before any model outputs;
- baselines differ only in the memory mechanism under test;
- scoring separates symbolic, extraction, and answer errors;
- the private-data exclusion is honored;
- dataset and source hashes reproduce;
- no result language overstates a pilot or smoke test.

## Verdict map

- `GO`: method is executable as written, all pilot gold labels are complete,
  sentinels can detect leakage/budget mismatch, and beta reproduces hashes.
- `BOUNDED-GO`: method is executable but a named limitation restricts the next
  wave; the bound is recorded without weakening pre-registered thresholds.
- `REVISE`: correctable incompleteness in cases, scoring, manifests, or commands.
- `NO-GO`: the method cannot distinguish symbolic, extraction, and end-to-end
  causes, or requires invalid/private data.
- `INDETERMINATE`: a required provider/runtime cannot be identified well enough
  to make the next wave reproducible.

## Non-goals

- No claim of product usefulness or scientific novelty.
- No ontology expansion, vector database, UI, performance optimization, or
  production deployment.
- No live-model benchmark beyond any minimal check needed to prove the method
  is executable.
- No publication-ready statistical significance claim from 12 pilot cases.
- No changes to application source code in this research wave.

## Dispatch references

- Alpha: `.cdr/waves/prolog-memory-eval-v0/alpha-dispatch.md`
- Beta: `.cdr/waves/prolog-memory-eval-v0/beta-dispatch.md`

The dispatch prompts reference this manifest; they do not restate its hidden
rationale. The current delta/gamma session must not act as either reviewer.
