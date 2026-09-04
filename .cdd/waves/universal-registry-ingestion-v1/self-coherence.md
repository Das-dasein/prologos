# Alpha self-coherence: universal-registry-ingestion-v1

Issue: GitHub #15. Parent design: GitHub #4.
Branch: cycle/15.
Base: 1def4ac.

## Gap

The shipped chat-ingestion path owned predicate signatures independently in
memory-store.js, llm-schema.js, and the checked-in Codex schema. The isolated
rule-hypothesis registry was a different contract. A vocabulary change could
therefore drift across provider validation and durable serialization, and
extraction output carried no identity proving which registry it used.

## Skills

- CDD generic kernel and CDS work-shape rules.
- cdd/issue, cdd/issue/contract, cdd/issue/proof,
  cdd/issue/constraints, and cdd/issue/labels for the implementation
  follow-up issue.
- CDD design boundary from
  .cdd/designs/semantic-extraction-registry-v0.md.

## Matter

- ontology-registry.js loads exact ontology-profile-v1 and ontology-layer-v1
  documents, rejects unsafe/duplicate/cyclic/out-of-root declarations, and
  computes a canonical SHA-256 identity.
- ontology/active-profile-v1.json explicitly composes universal-core-v1.json
  and conversation-profile-v1.json.
- llm-schema.js generates the extraction Zod validator, prompt guide, and
  Codex JSON Schema projection from the active profile. Domain-specific
  likes/2 polarity guidance moved into the conversation layer.
- memory-extraction-v2 binds registered assertion candidates and untrusted
  ontology candidates to the exact active registry identity.
- Both providers and chat.js consume the v2 envelope.
- MemoryStore.add revalidates identity, exact keys, predicate, arity, atom
  safety, qualifiers, and ontology-candidate structure before any append.
- Candidate-only extraction returns diagnostic candidates and leaves memory
  byte-identical.
- test-registry-ingestion.js covers generation, hash drift, invalid
  declarations, textual and symlink path escape, stale output, wrong arity,
  unknown vocabulary, and no-mutation behavior.
- README now distinguishes the active ingestion profile from the separate
  isolated rule-hypothesis registry.

## ACs

| AC | Evidence | Alpha result |
|---|---|---|
| AC1 layered profile boundary | active profile projection; duplicate/key/type/cycle/path fixtures | PASS |
| AC2 content-addressed identity | stable SHA-256 plus declaration-change fixture | PASS |
| AC3 generated extraction contract | Zod/OpenAI format check, fake Codex provider, checked-in schema equality | PASS |
| AC4 stale output fails before write | stale and extra-key identities with byte-identical memory | PASS |
| AC5 unknown vocabulary remains untrusted | unknown assertion rejection and typed ontology candidate fixture | PASS |
| AC6 candidate-only no mutation | returned candidate plus before/after memory comparison | PASS |
| AC7 regression evidence | full Prolog/reflection/ontology/Elenchus/CDR commands | PASS |

## CDD Trace

| Step | Artifact | Result |
|---|---|---|
| Contract | GitHub #15; gamma-spec.md | implementation boundary pinned |
| Alpha matter | source, profile JSON, schema, providers, tests, README | produced |
| Alpha evidence | commands below | passing |
| Beta review | fresh session against immutable commit | pending |
| Gamma receipt / delta decision | not authorized by alpha | pending |

## Self-check

    npm test                      PASS
    npm run test:cdr-annotation   PASS
    npm run test:cdr-gold         PASS (12/12)
    node ontology-registry.js     PASS; core/domain projection visible
    generated schema equality     PASS
    git diff --check              PASS

No .cdr/**, trusted Prolog rule, evaluation threshold, or gold oracle is
changed. Ontology candidates are never compiled, executed, appended, or
promoted.

## Debt

- No live-model run is evidence in this cell; semantic extraction quality
  remains unknown.
- Argument types constrain signatures and candidates but do not classify or
  validate assertion atoms as entity instances.
- Candidate promotion, ontology governance, profile distribution, and version
  negotiation remain absent.
- The isolated ontology-harness.js proposal registry remains a separate
  contract.
- extractClaims / array-shaped prototype callers have no compatibility
  adapter; the in-repository callers migrate atomically to extractMemory /
  memory-extraction-v2.
- The schema generator is an exported function with a drift test, not yet an
  operator-facing regeneration command.
- Core and domain declarations are supplied models, not proven-complete common
  knowledge.

Alpha judgment: ready for an immutable commit and fresh independent beta
review. This is not a beta verdict, CDR receipt, or truth claim.
