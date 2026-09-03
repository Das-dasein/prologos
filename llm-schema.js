const { z } = require("zod");
const { RELATIONS } = require("./memory-store");

const Proposal = z.object({
  polarity: z.enum(["positive", "negative"]),
  relation: z.enum([...RELATIONS]),
  arguments: z.array(z.string()).min(1).max(4),
  valid_from: z.number().int().nullable(),
  valid_to: z.number().int().nullable(),
  confidence: z.number().min(0).max(1),
});

const Extraction = z.object({ claims: z.array(Proposal) });

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

// Shape gate for the LLM transport; ontology-harness performs the stricter
// registry, entity-type, provenance and qualifier validation afterwards.
const SemanticRecord = z.object({
  schema_version: z.literal("semantic-dialogue-v1"),
  registry: z.record(z.string(), z.any()),
  entities: z.array(z.any()).max(100),
  assertions: z.array(z.any()).max(100),
});

const EXTRACTION_INSTRUCTIONS = `Extract only durable user facts worth remembering.
Return an empty claims array for chatter, questions, hypotheticals, quoted text, or uncertain claims.
Normalize entities as lowercase latin snake_case Prolog atoms.
Use YYYYMMDD integer dates or null. Never infer sensitive facts.
Allowed relations: ${[...RELATIONS].join(", ")}.`;

module.exports = { Extraction, ReflectionProposal, SemanticRecord, EXTRACTION_INSTRUCTIONS };
