"use strict";

const { z } = require("zod");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");

const ATOM = /^[a-z][a-z0-9_]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DATE = z.number().int().min(10000101).max(99991231).nullable();

function createExtractionSchema(registry = ACTIVE_ONTOLOGY) {
  const predicates = Object.keys(registry.predicates)
    .filter(name => registry.predicates[name].kind === "base");
  const types = Object.keys(registry.types);
  const AssertionCandidate = z.object({
    polarity: z.enum(["positive", "negative"]),
    relation: z.enum(predicates),
    arguments: z.array(z.string().regex(ATOM)).min(1).max(4),
    valid_from: DATE,
    valid_to: DATE,
    confidence: z.number().min(0).max(1),
  }).strict().superRefine((proposal, context) => {
    const expected = registry.predicates[proposal.relation].arity;
    if (proposal.arguments.length !== expected)
      context.addIssue({ code: "custom", path: ["arguments"], message: `${proposal.relation} requires ${expected} arguments` });
  });
  const OntologyCandidate = z.object({
    name: z.string().regex(ATOM),
    arity: z.number().int().min(1).max(4),
    argument_types: z.array(z.enum(types)).min(1).max(4),
    meaning: z.string().min(1).max(500),
    evidence_span: z.string().min(1).max(2000),
  }).strict().superRefine((candidate, context) => {
    if (candidate.argument_types.length !== candidate.arity)
      context.addIssue({ code: "custom", path: ["argument_types"], message: `${candidate.name} requires ${candidate.arity} argument types` });
    if (registry.predicates[candidate.name])
      context.addIssue({ code: "custom", path: ["name"], message: `${candidate.name} is already registered` });
  });
  return z.object({
    schema_version: z.literal("memory-extraction-v2"),
    registry_identity: z.object({
      name: z.literal(registry.identity.name),
      version: z.literal(registry.identity.version),
      sha256: z.literal(registry.identity.sha256),
    }).strict(),
    assertions: z.array(AssertionCandidate).max(100),
    ontology_candidates: z.array(OntologyCandidate).max(50),
  }).strict();
}

function createMemoryExtractionJsonSchema(registry = ACTIVE_ONTOLOGY) {
  const predicateNames = Object.keys(registry.predicates)
    .filter(name => registry.predicates[name].kind === "base");
  const typeNames = Object.keys(registry.types);
  return {
    type: "object",
    properties: {
      schema_version: { const: "memory-extraction-v2" },
      registry_identity: {
        type: "object",
        properties: {
          name: { const: registry.identity.name },
          version: { const: registry.identity.version },
          sha256: { const: registry.identity.sha256 },
        },
        required: ["name", "version", "sha256"],
        additionalProperties: false,
      },
      assertions: {
        type: "array",
        maxItems: 100,
        items: {
          type: "object",
          properties: {
            polarity: { type: "string", enum: ["positive", "negative"] },
            relation: { type: "string", enum: predicateNames },
            arguments: { type: "array", items: { type: "string", pattern: ATOM.source }, minItems: 1, maxItems: 4 },
            valid_from: { type: ["integer", "null"], minimum: 10000101, maximum: 99991231 },
            valid_to: { type: ["integer", "null"], minimum: 10000101, maximum: 99991231 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["polarity", "relation", "arguments", "valid_from", "valid_to", "confidence"],
          additionalProperties: false,
        },
      },
      ontology_candidates: {
        type: "array",
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            name: { type: "string", pattern: ATOM.source },
            arity: { type: "integer", minimum: 1, maximum: 4 },
            argument_types: { type: "array", items: { type: "string", enum: typeNames }, minItems: 1, maxItems: 4 },
            meaning: { type: "string", minLength: 1, maxLength: 500 },
            evidence_span: { type: "string", minLength: 1, maxLength: 2000 },
          },
          required: ["name", "arity", "argument_types", "meaning", "evidence_span"],
          additionalProperties: false,
        },
      },
    },
    required: ["schema_version", "registry_identity", "assertions", "ontology_candidates"],
    additionalProperties: false,
  };
}

const Extraction = createExtractionSchema();

const ReflectionAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_duplicate"), canonical_id: z.string(), duplicate_id: z.string(), reason: z.string().min(1) }),
  z.object({ action: z.literal("propose_alias"), from: z.string(), to: z.string(), reason: z.string().min(1) }),
  z.object({ action: z.literal("propose_revision"), new_id: z.string(), old_id: z.string(), relation: z.enum(["replaces", "confirms"]), reason: z.string().min(1) }),
  z.object({ action: z.literal("review"), assertion_id: z.string(), reason: z.string().min(1) }),
]);

const ReflectionProposal = z.object({
  schema_version: z.literal("reflection-proposal-v1"),
  actions: z.array(ReflectionAction).max(50),
});

const HypothesisTerm = z.object({
  predicate: z.string(),
  arguments: z.array(z.string()).min(1).max(4),
}).strict();

const ReflectionHypothesis = z.object({
  schema_version: z.literal("reflection-hypothesis-v1"),
  hypothesis_id: z.string().regex(/^h_[a-z0-9_]{1,47}$/),
  decision: z.literal("proposed"),
  registry_identity: z.object({
    name: z.string().regex(ATOM),
    version: z.literal("predicate-registry-v1"),
    sha256: z.string().regex(SHA256),
  }).strict(),
  registry: z.object({
    version: z.literal("predicate-registry-v1"),
    declarations: z.array(z.object({
      name: z.string(), arity: z.number().int(), kind: z.enum(["base", "derived"]),
    }).strict()).min(1).max(100),
  }).strict(),
  supporting_assertion_ids: z.array(z.string().regex(ATOM)).min(1).max(100),
  rule: z.object({
    id: z.string(), head: HypothesisTerm, body: z.array(HypothesisTerm).min(1).max(4),
  }).strict(),
}).strict();

function registryGuide(registry = ACTIVE_ONTOLOGY) {
  return registry.layers.flatMap(layer => [
    `[${layer.role}: ${layer.registry.identity.name}@${layer.registry.identity.version}]`,
    ...layer.registry.predicates
      .filter(predicate => predicate.kind === "base")
      .map(predicate => `- ${predicate.name}/${predicate.arity} (${predicate.argument_types.join(", ")}): ${predicate.meaning}`),
  ]).join("\n");
}

const RELATION_GUIDE = registryGuide();
const EXTRACTION_INSTRUCTIONS = `You are the structured ingestion component for a Prolog-backed assertion journal.
You are not a conversational assistant. Emit one memory-extraction-v2 object and no prose.
The active ontology profile identity is ${ACTIVE_ONTOLOGY.identity.name}@${ACTIVE_ONTOLOGY.identity.version} sha256:${ACTIVE_ONTOLOGY.identity.sha256}.
Copy that exact identity into registry_identity. Never invent or reuse a stale identity.

Extract only durable user statements worth remembering. Return empty arrays for chatter, questions, hypotheticals, quoted text, or uncertain claims.
Normalize assertion arguments as lowercase latin snake_case Prolog atoms. Use YYYYMMDD integer dates or null. Never infer sensitive facts.
Use polarity=positive for an affirmed registered proposition and polarity=negative for its explicit negation. Follow the predicate meanings below; do not invent an antonym predicate when polarity preserves the user's statement.

Only registered base predicates may appear in assertions, with exact argument order and arity:
${RELATION_GUIDE}

If a durable statement requires a safe but unregistered predicate, do not emit it as an assertion. Put it in ontology_candidates with a proposed lowercase snake_case name, arity, registered argument types, a concise meaning, and the verbatim supporting span from the user message. Ontology candidates are untrusted diagnostics: they are not assertions and cannot modify memory or the ontology profile.`;

module.exports = {
  Extraction,
  ReflectionProposal,
  ReflectionHypothesis,
  EXTRACTION_INSTRUCTIONS,
  RELATION_GUIDE,
  createExtractionSchema,
  createMemoryExtractionJsonSchema,
  registryGuide,
};
