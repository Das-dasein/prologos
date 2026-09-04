# Independent beta review: universal-registry-ingestion-v1

Issue: GitHub #15, `CDS: bind memory extraction to the versioned ontology profile`.
Reviewed branch: `cycle/15`.
Reviewed implementation commit: `09a81b81c6109a15142c676d9dda85c1bb5eeed9`.
Parent commit: `1def4ac`.
Review mode: fresh independent beta review of the immutable alpha commit.

## Verdict

**REQUEST CHANGES**

The implementation is coherent for the checked-in profile and the deterministic
regression suite passes, but AC5 is not closed: an ontology candidate may use a
reserved Prolog/runtime predicate name. The same validator also has a latent
registered-`derived` predicate gap. These names are accepted as candidate
diagnostics today, contrary to the safe-name and registered-name contract, and
would become unsafe if a later workflow promoted or compiled candidate data.

This is CDD/CDS contract evidence only. Passing deterministic tests does not
provide CDR evidence of live-model extraction quality, semantic correctness, or
ontology completeness.

## Binding findings

### F1 — unsafe runtime predicate names pass ontology-candidate validation (AC5)

`memory-store.js:49-52` checks only the lowercase atom regexp and membership in
the base `RELATIONS` set. It does not consult the `RESERVED_PREDICATES` set from
`ontology-registry.js`. `llm-schema.js:26-37` has the same omission: its
candidate refinement rejects names present in `registry.predicates`, but does
not reject reserved runtime names.

Reproduction against the reviewed commit:

    node - <<'NODE'
    const { validateOntologyCandidate } = require('./memory-store');
    for (const name of ['assert', 'consult', 'assertion']) {
      validateOntologyCandidate({
        name, arity: 1, argument_types: ['entity'],
        meaning: 'x', evidence_span: 'x',
      });
      console.log(`${name}: ACCEPTED`);
    }
    NODE

Observed output:

    assert: ACCEPTED
    consult: ACCEPTED
    assertion: ACCEPTED

The gamma contract requires a safe proposed name and explicitly treats unsafe
names as a negative AC5 case. Candidate data is not currently serialized, but
accepting executable/runtime names violates the trust boundary and leaves the
later candidate-governance path unsafe. The correction must use one shared
reserved-name check in both the Zod and write-boundary validators; it must also
cover the complete runtime-reserved set rather than only base memory names.

### F2 — registered derived predicate names are not rejected by the write validator (AC5)

`memory-store.js:49-53` tests `RELATIONS`, which is constructed from only
`kind === "base"` declarations (`ontology-registry.js:148-150`). The ontology
layer schema accepts both `base` and `derived` (`ontology-registry.js:78-82`),
so a valid profile containing `derived: true` predicate declarations would let
`validateOntologyCandidate` accept a candidate whose name is already registered
as derived. The generated Zod schema correctly checks all
`registry.predicates` (`llm-schema.js:35`), creating a validator mismatch.

The active profile currently has no derived declarations, so this is a latent
but binding profile-contract defect rather than a claim that the current
profile already permits one. Candidate names must be rejected against all
registered predicates, independent of whether they are executable base
predicates.

## Acceptance-criteria map

| AC | Result | Evidence / limitation |
|---|---|---|
| AC1 layered profile boundary | PASS | `ontology/active-profile-v1.json` selects explicit core and domain layers; `test-registry-ingestion.js` exercises projection, duplicate, key, type, cycle, and textual/symlink path failures. |
| AC2 content-addressed identity | PASS | Loader hashes profile identity, ordered roles, and normalized complete layer documents; focused test changes a declaration and observes a changed SHA-256. |
| AC3 generated extraction contract | PASS with bounded caveat | Prompt, Zod schema, OpenAI format, Codex schema, and checked-in schema are profile-derived; equality and provider fixtures pass. The JSON schema itself does not encode per-predicate arity conditionals, so final exact-arity enforcement relies on the post-output Zod parse/write validator. |
| AC4 stale output fails before write | PASS | `validateExtraction` checks exact identity before facts are produced; focused stale and extra-key fixtures verify byte-identical memory. |
| AC5 unknown vocabulary remains untrusted | **FAIL** | Unknown base assertions and typed candidates are covered, but F1 accepts reserved runtime names and F2 leaves registered derived names inconsistent. |
| AC6 candidate-only no mutation | PASS, evidence bounded | Candidate-only `MemoryStore.add` returns diagnostics and leaves memory bytes unchanged; source has no candidate write path. The focused test does not independently compare registry JSON bytes. |
| AC7 deterministic regression evidence | PASS | All requested regression commands below passed; no CDR data, threshold, or oracle was changed. |

## Rerun evidence

All commands were run from a clean checkout at the reviewed alpha commit before
creating this review artifact.

    git rev-parse HEAD
    09a81b81c6109a15142c676d9dda85c1bb5eeed9

    npm test
    ok
    cdr gold harness ok
    core/domain boundary ok
    memory-store ok
    memory reflection ok
    codex-provider ok
    ontology-harness ok
    elenchus ok
    registry-ingestion ok

    npm run test:cdr-annotation
    cdr annotation ok

    npm run test:cdr-gold
    status=ok, mode=gold-injection, case_count=12
    (all 12 cases status=ok)

    node ontology-registry.js
    status=0; active projection printed `prologos_agent_memory@1.0.0`,
    `[core]`, and `[domain]`, with sha256
    `40558d46e4e73028cc19e5f97cdaf316833f74b916f76552f6443e8d5312e3a0`.

    git diff --check 1def4ac..09a81b81c6109a15142c676d9dda85c1bb5eeed9
    status=0

The gold harness reported `source_commit` equal to the reviewed alpha SHA.

## Scope and provenance audit

The complete parent-to-alpha diff contains the intended profile loader and
documents, generated extraction contract, both providers, chat caller,
serializer, checked-in schema, focused tests, regression updates, and README
boundary text. No `.cdr/**` file, trusted Prolog rule, CDR threshold, dataset,
or oracle was changed. The focused tests exercise profile path containment,
including symlink escape; atom validation prevents assertion-term injection;
stale identity is checked before append; and candidates have no append or
registry-file mutation path.

The self-coherence report's claims about passing commands and the absence of
live-model evidence were independently checked. The philosophical
`agent-epistemology-v0.md` proposal was used only as non-authoritative context;
runtime acceptance is determined by issue #15 and the wave contract.

## Known limitations carried forward

- No live-model run exists here; extraction semantic quality, candidate value,
  and ontology completeness remain unknown.
- Argument types constrain declarations and candidate fields but do not perform
  entity-instance type checking for assertion atoms.
- Candidate promotion, governance, profile distribution, and version
  negotiation remain out of scope.
- The isolated `ontology-harness.js` rule-hypothesis registry remains a
  separate contract.
- The candidate-only focused test compares memory bytes but not registry-file
  bytes; implementation inspection found no registry write operation.
- The checked-in Codex schema is equality-tested against the generator, but an
  operator-facing schema regeneration command is still absent.

## Closure condition

Do not issue a gamma receipt or merge decision from this beta review. Resolve
F1 and F2 with deterministic negative fixtures for reserved and derived
registered candidate names, rerun the complete proof commands, and obtain a
fresh beta review of the resulting immutable implementation commit.
