#!/usr/bin/env node
const fs = require("node:fs");

process.stdin.resume();
let prompt = "";
process.stdin.on("data", chunk => { prompt += chunk; });
process.stdin.on("end", () => {
  if (process.argv.includes("--output-schema")) {
    const schema = process.argv[process.argv.indexOf("--output-schema") + 1];
    const extractionSchema = schema.includes("reflection-proposal") ? null : JSON.parse(fs.readFileSync(schema, "utf8"));
    const identity = extractionSchema && Object.fromEntries(
      Object.entries(extractionSchema.properties.registry_identity.properties)
        .map(([key, value]) => [key, value.const]),
    );
    const policyIdentity = extractionSchema && extractionSchema.properties.policy_identity && Object.fromEntries(
      Object.entries(extractionSchema.properties.policy_identity.properties)
        .map(([key, value]) => [key, value.const]),
    );
    const schemaVersion = extractionSchema && extractionSchema.properties.schema_version.const;
    const decisionContract = extractionSchema && Object.hasOwn(extractionSchema.properties, "decision");
    const assertionEvidence = extractionSchema && extractionSchema.properties.assertions.items.required.includes("evidence_span");
    const intervalRepair = prompt.includes("repair interval");
    const isRepair = prompt.includes("You are repairing one rejected extraction candidate");
    process.stdout.write(JSON.stringify(schema.includes("reflection-proposal") ? {
      schema_version: "reflection-proposal-v1",
      actions: [{ action: "mark_duplicate", canonical_id: "a_reflect_one", duplicate_id: "a_reflect_two", reason: "same proposition; fixture source" }]
    } : intervalRepair ? {
      schema_version: schemaVersion,
      registry_identity: identity,
      ...(policyIdentity ? { policy_identity: policyIdentity } : {}),
      ...(decisionContract ? { decision: "write", clarification: null } : {}),
      assertions: [{
        polarity: "positive",
        relation: "knows_technology",
        arguments: ["user", "prolog"],
        valid_from: 20260102,
        valid_to: isRepair ? null : 20260101,
        confidence: 0.99,
        ...(assertionEvidence ? { evidence_span: "repair interval" } : {})
      }],
      ontology_candidates: []
    } : prompt.includes("pizza") ? {
      schema_version: schemaVersion,
      registry_identity: identity,
      ...(policyIdentity ? { policy_identity: policyIdentity } : {}),
      ...(decisionContract ? { decision: "write", clarification: null } : {}),
      assertions: [
        { polarity: "positive", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99, ...(assertionEvidence ? { evidence_span: "I love pizza" } : {}) },
        { polarity: "negative", relation: "likes", arguments: ["user", "pizza"], valid_from: null, valid_to: null, confidence: 0.99, ...(assertionEvidence ? { evidence_span: "cannot stand pizza" } : {}) }
      ],
      ontology_candidates: []
    } : {
      schema_version: schemaVersion,
      registry_identity: identity,
      ...(policyIdentity ? { policy_identity: policyIdentity } : {}),
      ...(decisionContract ? { decision: "write", clarification: null } : {}),
      assertions: [{
        polarity: "positive",
        relation: "knows_technology",
        arguments: ["user", "python"],
        valid_from: null,
        valid_to: null,
        confidence: 0.99,
        ...(assertionEvidence ? { evidence_span: "Я знаю Python" } : {})
      }],
      ontology_candidates: []
    }));
  } else {
    process.stdout.write("Mock response grounded in Prolog memory.");
  }
});
