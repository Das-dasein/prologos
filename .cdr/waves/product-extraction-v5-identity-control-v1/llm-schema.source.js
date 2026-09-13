"use strict";

const { z } = require("zod");
const {
  ACTIVE_ONTOLOGY,
  RESERVED_PREDICATES,
  validateOntologyCandidateName,
} = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY, groundingPolicyGuide } = require("./predicate-grounding-policy");

const ATOM = /^[a-z][a-z0-9_]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DATE = z.number().int().min(10000101).max(99991231).nullable();

function createExtractionSchema(registry = ACTIVE_ONTOLOGY, options = {}) {
  const schemaVersion = options.schemaVersion || "memory-extraction-v2";
  const assertionEvidence = options.assertionEvidence === true;
  const decisionContract = options.decisionContract === true;
  const groundingPolicy = options.groundingPolicy || null;
  const predicates = Object.keys(registry.predicates)
    .filter(name => registry.predicates[name].kind === "base");
  const types = Object.keys(registry.types);
  const assertionShape = {
    polarity: z.enum(["positive", "negative"]),
    relation: z.enum(predicates),
    arguments: z.array(z.string().regex(ATOM)).min(1).max(4),
    valid_from: DATE,
    valid_to: DATE,
    confidence: z.number().min(0).max(1),
  };
  if (assertionEvidence) assertionShape.evidence_span = z.string().min(1).max(2000);
  const AssertionCandidate = z.object(assertionShape).strict().superRefine((proposal, context) => {
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
    try {
      validateOntologyCandidateName(candidate.name, registry);
    } catch (error) {
      context.addIssue({ code: "custom", path: ["name"], message: error.message });
    }
  });
  const shape = {
    schema_version: z.literal(schemaVersion),
    registry_identity: z.object({
      name: z.literal(registry.identity.name),
      version: z.literal(registry.identity.version),
      sha256: z.literal(registry.identity.sha256),
    }).strict(),
    assertions: z.array(AssertionCandidate).max(100),
    ontology_candidates: z.array(OntologyCandidate).max(50),
  };
  if (groundingPolicy) shape.policy_identity = z.object({
    name: z.literal(groundingPolicy.identity.name),
    version: z.literal(groundingPolicy.identity.version),
    sha256: z.literal(groundingPolicy.identity.sha256),
  }).strict();
  if (!decisionContract) return z.object(shape).strict();
  shape.decision = z.enum(["write", "ignore", "clarify", "ontology_candidate"]);
  shape.clarification = z.object({
    question: z.string().min(1).max(500),
    evidence_span: z.string().min(1).max(2000),
  }).strict().nullable();
  return z.object(shape).strict().superRefine((candidate, context) => {
    const counts = { assertions: candidate.assertions.length, ontology: candidate.ontology_candidates.length };
    const invalid = message => context.addIssue({ code: "custom", path: ["decision"], message });
    if (candidate.decision === "write" && (!counts.assertions || candidate.clarification !== null))
      invalid("write requires at least one assertion and no clarification");
    if (candidate.decision === "ignore" && (counts.assertions || counts.ontology || candidate.clarification !== null))
      invalid("ignore requires empty collections and no clarification");
    if (candidate.decision === "clarify" && (counts.assertions || counts.ontology || candidate.clarification === null))
      invalid("clarify requires one clarification and no proposed writes");
    if (candidate.decision === "ontology_candidate" && (counts.assertions || !counts.ontology || candidate.clarification !== null))
      invalid("ontology_candidate requires at least one ontology candidate and no assertion or clarification");
  });
}

function createMemoryExtractionJsonSchema(registry = ACTIVE_ONTOLOGY, options = {}) {
  const schemaVersion = options.schemaVersion || "memory-extraction-v2";
  const assertionEvidence = options.assertionEvidence === true;
  const decisionContract = options.decisionContract === true;
  const groundingPolicy = options.groundingPolicy || null;
  const predicateNames = Object.keys(registry.predicates)
    .filter(name => registry.predicates[name].kind === "base");
  const typeNames = Object.keys(registry.types);
  const stringConst = value => assertionEvidence ? { type: "string", const: value } : { const: value };
  return {
    type: "object",
    properties: {
      schema_version: stringConst(schemaVersion),
      registry_identity: {
        type: "object",
        properties: {
          name: stringConst(registry.identity.name),
          version: stringConst(registry.identity.version),
          sha256: stringConst(registry.identity.sha256),
        },
        required: ["name", "version", "sha256"],
        additionalProperties: false,
      },
      ...(groundingPolicy ? {
        policy_identity: {
          type: "object",
          properties: {
            name: stringConst(groundingPolicy.identity.name),
            version: stringConst(groundingPolicy.identity.version),
            sha256: stringConst(groundingPolicy.identity.sha256),
          },
          required: ["name", "version", "sha256"],
          additionalProperties: false,
        },
      } : {}),
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
            ...(assertionEvidence ? { evidence_span: { type: "string", minLength: 1, maxLength: 2000 } } : {}),
          },
          required: ["polarity", "relation", "arguments", "valid_from", "valid_to", "confidence", ...(assertionEvidence ? ["evidence_span"] : [])],
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
      ...(decisionContract ? {
        decision: { type: "string", enum: ["write", "ignore", "clarify", "ontology_candidate"] },
        clarification: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                question: { type: "string", minLength: 1, maxLength: 500 },
                evidence_span: { type: "string", minLength: 1, maxLength: 2000 },
              },
              required: ["question", "evidence_span"],
              additionalProperties: false,
            },
          ],
        },
      } : {}),
    },
    required: ["schema_version", "registry_identity", ...(groundingPolicy ? ["policy_identity"] : []), "assertions", "ontology_candidates", ...(decisionContract ? ["decision", "clarification"] : [])],
    additionalProperties: false,
  };
}

const Extraction = createExtractionSchema();
const EvidenceExtraction = createExtractionSchema(ACTIVE_ONTOLOGY, {
  schemaVersion: "memory-extraction-v3",
  assertionEvidence: true,
});
const DecisionExtraction = createExtractionSchema(ACTIVE_ONTOLOGY, {
  schemaVersion: "memory-extraction-v4",
  assertionEvidence: true,
  decisionContract: true,
});
const PolicyDecisionExtraction = createExtractionSchema(ACTIVE_ONTOLOGY, {
  schemaVersion: "memory-extraction-v5",
  assertionEvidence: true,
  decisionContract: true,
  groundingPolicy: ACTIVE_GROUNDING_POLICY,
});

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
const RESERVED_CANDIDATE_NAMES = [...RESERVED_PREDICATES].sort().join(", ");
const EXTRACTION_INSTRUCTIONS = `You are the structured ingestion component for a Prolog-backed assertion journal.
You are not a conversational assistant. Emit one memory-extraction-v2 object and no prose.
The active ontology profile identity is ${ACTIVE_ONTOLOGY.identity.name}@${ACTIVE_ONTOLOGY.identity.version} sha256:${ACTIVE_ONTOLOGY.identity.sha256}.
Copy that exact identity into registry_identity. Never invent or reuse a stale identity.

Extract only durable user statements worth remembering. Return empty arrays for chatter, questions, hypotheticals, quoted text, or uncertain claims.
Normalize assertion arguments as lowercase latin snake_case Prolog atoms. Use YYYYMMDD integer dates or null. Never infer sensitive facts.
Use polarity=positive for an affirmed registered proposition and polarity=negative for its explicit negation. Follow the predicate meanings below; do not invent an antonym predicate when polarity preserves the user's statement.

Only registered base predicates may appear in assertions, with exact argument order and arity:
${RELATION_GUIDE}

If a durable statement requires a safe but unregistered predicate, do not emit it as an assertion. Put it in ontology_candidates with a proposed lowercase snake_case name, arity, registered argument types, a concise meaning, and the verbatim supporting span from the user message. Never propose a reserved runtime name: ${RESERVED_CANDIDATE_NAMES}. Ontology candidates are untrusted diagnostics: they are not assertions and cannot modify memory or the ontology profile.`;

const ADMISSION_EXTRACTION_INSTRUCTIONS = `${EXTRACTION_INSTRUCTIONS.replaceAll("memory-extraction-v2", "memory-extraction-v3")}

Every assertion must include evidence_span containing the exact non-empty substring of the user message that supports that assertion. Do not paraphrase the span and do not use text outside the user message.`;

const EXTRACTION_REPAIR_INSTRUCTIONS = `${ADMISSION_EXTRACTION_INSTRUCTIONS}

You are repairing one rejected extraction candidate. Correct only the listed validator diagnostics. Preserve every unaffected field exactly. Do not add claims, remove supported claims, reinterpret the user message, or change the registry identity. The result is an untrusted repair proposal and will not be admitted automatically.`;

const DECISION_EXTRACTION_INSTRUCTIONS = `${ADMISSION_EXTRACTION_INSTRUCTIONS.replaceAll("memory-extraction-v3", "memory-extraction-v4")}

Choose exactly one decision:
- write: emit one or more supported registered assertions; clarification must be null.
- ignore: chatter, a question, hypothetical, quotation, or non-durable content; both collections must be empty and clarification null.
- clarify: a durable claim cannot be safely grounded to a person or entity; both collections must be empty and clarification must contain one concise question and the exact ambiguous source span.
- ontology_candidate: the durable claim needs an unregistered predicate; assertions must be empty, emit at least one ontology candidate, and clarification must be null.

Never guess a pronoun antecedent. A decision is an untrusted proposal and cannot write memory by itself.`;

const DECISION_EXTRACTION_REPAIR_INSTRUCTIONS = `${DECISION_EXTRACTION_INSTRUCTIONS}

You are repairing one rejected extraction candidate. Correct only the listed validator diagnostics. Preserve every unaffected field exactly. Do not add claims, remove supported claims, reinterpret the user message, or change the registry identity. The result is an untrusted repair proposal and will not be admitted automatically.`;

const POLICY_DECISION_EXTRACTION_INSTRUCTIONS = `${DECISION_EXTRACTION_INSTRUCTIONS.replaceAll("memory-extraction-v4", "memory-extraction-v5")}

The predicate-grounding policy identity is ${ACTIVE_GROUNDING_POLICY.identity.name}@${ACTIVE_GROUNDING_POLICY.identity.version} sha256:${ACTIVE_GROUNDING_POLICY.identity.sha256}.
Copy that exact identity into policy_identity. Apply this policy before choosing a registered assertion or deciding that the source requires clarification or an ontology candidate:
${groundingPolicyGuide()}`;

module.exports = {
  Extraction,
  EvidenceExtraction,
  DecisionExtraction,
  PolicyDecisionExtraction,
  ReflectionProposal,
  ReflectionHypothesis,
  EXTRACTION_INSTRUCTIONS,
  ADMISSION_EXTRACTION_INSTRUCTIONS,
  EXTRACTION_REPAIR_INSTRUCTIONS,
  DECISION_EXTRACTION_INSTRUCTIONS,
  DECISION_EXTRACTION_REPAIR_INSTRUCTIONS,
  POLICY_DECISION_EXTRACTION_INSTRUCTIONS,
  RELATION_GUIDE,
  createExtractionSchema,
  createMemoryExtractionJsonSchema,
  registryGuide,
};
