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

const HypothesisTerm = z.object({
  predicate: z.string(),
  arguments: z.array(z.string()).min(1).max(4),
}).strict();

const ReflectionHypothesis = z.object({
  schema_version: z.literal("reflection-hypothesis-v1"),
  hypothesis_id: z.string().regex(/^h_[a-z0-9_]{1,47}$/),
  decision: z.literal("proposed"),
  registry_identity: z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]*$/),
    version: z.literal("predicate-registry-v1"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  registry: z.object({
    version: z.literal("predicate-registry-v1"),
    declarations: z.array(z.object({
      name: z.string(), arity: z.number().int(), kind: z.enum(["base", "derived"]),
    }).strict()).min(1).max(100),
  }).strict(),
  supporting_assertion_ids: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1).max(100),
  rule: z.object({
    id: z.string(), head: HypothesisTerm, body: z.array(HypothesisTerm).min(1).max(4),
  }).strict(),
}).strict();

const EXTRACTION_INSTRUCTIONS = `Extract only durable user facts worth remembering.
Return an empty claims array for chatter, questions, hypotheticals, quoted text, or uncertain claims.
Normalize entities as lowercase latin snake_case Prolog atoms.
Use YYYYMMDD integer dates or null. Never infer sensitive facts.
Allowed relations: ${[...RELATIONS].join(", ")}.`;

module.exports = { Extraction, ReflectionProposal, ReflectionHypothesis, EXTRACTION_INSTRUCTIONS };
