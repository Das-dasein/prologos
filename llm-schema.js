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

const EXTRACTION_INSTRUCTIONS = `Extract only durable user facts worth remembering.
Return an empty claims array for chatter, questions, hypotheticals, quoted text, or uncertain claims.
Normalize entities as lowercase latin snake_case Prolog atoms.
Use YYYYMMDD integer dates or null. Never infer sensitive facts.
Allowed relations: ${[...RELATIONS].join(", ")}.`;

module.exports = { Extraction, EXTRACTION_INSTRUCTIONS };

