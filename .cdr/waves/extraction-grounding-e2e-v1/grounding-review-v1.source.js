"use strict";

const crypto = require("node:crypto");
const { z } = require("zod");
const { canonicalJson } = require("./ontology-registry");
const { RELATION_GUIDE } = require("./llm-schema");

const SHA256 = /^[a-f0-9]{64}$/;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

const GroundingReview = z.object({
  schema_version: z.literal("memory-grounding-review-v1"),
  candidate_sha256: z.string().regex(SHA256),
  reviews: z.array(z.object({
    assertion_index: z.number().int().min(0).max(99),
    verdict: z.enum(["entailed", "not_entailed", "uncertain"]),
    evidence_span: z.string().min(1).max(2000),
    reason: z.string().min(1).max(500),
  }).strict()).max(100),
}).strict();

function createGroundingReviewJsonSchema() {
  return {
    type: "object",
    properties: {
      schema_version: { type: "string", const: "memory-grounding-review-v1" },
      candidate_sha256: { type: "string", pattern: SHA256.source },
      reviews: {
        type: "array",
        maxItems: 100,
        items: {
          type: "object",
          properties: {
            assertion_index: { type: "integer", minimum: 0, maximum: 99 },
            verdict: { type: "string", enum: ["entailed", "not_entailed", "uncertain"] },
            evidence_span: { type: "string", minLength: 1, maxLength: 2000 },
            reason: { type: "string", minLength: 1, maxLength: 500 },
          },
          required: ["assertion_index", "verdict", "evidence_span", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["schema_version", "candidate_sha256", "reviews"],
    additionalProperties: false,
  };
}

const GROUNDING_REVIEW_INSTRUCTIONS = `You review a quarantined memory extraction candidate against one user message.
You cannot write memory and must emit one memory-grounding-review-v1 object with no prose.

Review every assertion independently and exactly once, in assertion_index order.
- entailed: the literal user message directly supports the normalized relation and every argument.
- not_entailed: the message can be true while the assertion is false, including event-to-state, activity-to-role, association-to-employment, or other nearby-predicate coercion.
- uncertain: the proposition might be intended, but an entity reference, pronoun, scope, modality, quotation, or normalization is ambiguous.

Do not add common-world assumptions. Using a technology does not prove knowing it. Joining, meeting, calling, or being present does not prove employment. Performing an activity toward someone does not prove that the actor has a same-named role. Copy one exact non-empty supporting or problematic span from the user message into evidence_span.

Registered predicate meanings:
${RELATION_GUIDE}`;

function buildGroundingReviewPrompt(sourceText, candidate) {
  const candidateHash = sha256(canonicalJson(candidate));
  return `${GROUNDING_REVIEW_INSTRUCTIONS}\n\nUSER MESSAGE:\n${sourceText}\n\nCANDIDATE SHA256:\n${candidateHash}\n\nQUARANTINED CANDIDATE:\n${JSON.stringify(candidate)}\n\nReturn only the schema-conforming review. Do not use tools.`;
}

function inspectGroundingReview(review, sourceText, candidate) {
  const diagnostics = [];
  let parsed;
  try { parsed = GroundingReview.parse(review); }
  catch (error) { return [{ code: "schema_invalid", path: "$", message: error.message }]; }
  const candidateHash = sha256(canonicalJson(candidate));
  if (parsed.candidate_sha256 !== candidateHash)
    diagnostics.push({ code: "candidate_hash_mismatch", path: "$.candidate_sha256", message: "review is not bound to the selected extraction candidate" });
  if (parsed.reviews.length !== candidate.assertions.length)
    diagnostics.push({ code: "review_count_mismatch", path: "$.reviews", message: "every candidate assertion must be reviewed exactly once" });
  const seen = new Set();
  parsed.reviews.forEach((item, index) => {
    if (seen.has(item.assertion_index) || item.assertion_index >= candidate.assertions.length)
      diagnostics.push({ code: "review_index_mismatch", path: `$.reviews[${index}].assertion_index`, message: "review index must uniquely identify a candidate assertion" });
    seen.add(item.assertion_index);
    if (!sourceText.includes(item.evidence_span))
      diagnostics.push({ code: "review_evidence_not_verbatim", path: `$.reviews[${index}].evidence_span`, message: "review evidence must be a verbatim source substring" });
  });
  return diagnostics;
}

module.exports = {
  GroundingReview,
  GROUNDING_REVIEW_INSTRUCTIONS,
  buildGroundingReviewPrompt,
  createGroundingReviewJsonSchema,
  inspectGroundingReview,
  sha256,
};
