"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

const cases = [
  ["I mentor junior developers every week.", "role", ["user", "mentor"], "entailed", "habitual_role"],
  ["Yesterday I mentored one junior developer during a workshop.", "role", ["user", "mentor"], "not_entailed", "isolated_action"],
  ["I hope to become a mentor next year.", "role", ["user", "mentor"], "not_entailed", "desired_role"],
  ["If the team grows, I might act as a mentor.", "role", ["user", "mentor"], "not_entailed", "hypothetical_role"],
  ["I work at Acme.", "works_at", ["user", "acme"], "entailed", "direct_employment"],
  ["I joined the Acme migration project.", "works_at", ["user", "acme"], "not_entailed", "project_association"],
  ["I attended an Acme conference yesterday.", "works_at", ["user", "acme"], "not_entailed", "event_association"],
  ["I live in Porto.", "lives_in", ["user", "porto"], "entailed", "direct_residence"],
  ["I own an apartment in Porto.", "lives_in", ["user", "porto"], "not_entailed", "property_ownership"],
  ["I plan to move to Porto next summer.", "lives_in", ["user", "porto"], "not_entailed", "future_move"],
  ["I study at the University of Porto.", "studies_at", ["user", "university_of_porto"], "entailed", "direct_enrollment"],
  ["I attended one course at the University of Porto.", "studies_at", ["user", "university_of_porto"], "not_entailed", "single_course"],
  ["I know PostgreSQL well.", "knows_technology", ["user", "postgresql"], "entailed", "direct_knowledge"],
  ["I am reading the PostgreSQL manual.", "knows_technology", ["user", "postgresql"], "not_entailed", "reading_only"],
  ["I worked with Rust on my previous project.", "worked_with_technology", ["user", "rust"], "entailed", "past_work"],
  ["I currently use Rust at work.", "worked_with_technology", ["user", "rust"], "not_entailed", "current_use_only"],
  ["I use Docker every day.", "uses", ["user", "docker"], "entailed", "direct_use"],
  ["I might use Docker in a future project.", "uses", ["user", "docker"], "not_entailed", "hypothetical_use"],
  ["I am interested in temporal logic.", "interested_in", ["user", "temporal_logic"], "entailed", "direct_interest"],
  ["I attended one temporal logic seminar.", "interested_in", ["user", "temporal_logic"], "not_entailed", "single_attendance"],
  ["I previously worked on the Atlas project.", "previous_project", ["user", "atlas"], "entailed", "direct_previous_project"],
  ["I used to work at Atlas Labs.", "previous_project", ["user", "atlas_labs"], "not_entailed", "employment_only"],
  ["Acme employs me.", "works_at", ["user", "acme"], "entailed", "ascii_identity_normalization"],
  ["Я работаю в Кэндзи.", "works_at", ["user", "kenji"], "uncertain", "unadmitted_transliteration"],
];

function candidate(sourceText, relation, relationArguments) {
  return {
    schema_version: "memory-extraction-v4",
    registry_identity: ACTIVE_ONTOLOGY.identity,
    decision: "write",
    clarification: null,
    assertions: [{ polarity: "positive", relation, arguments: relationArguments, valid_from: null, valid_to: null, confidence: 0.99, evidence_span: sourceText }],
    ontology_candidates: [],
  };
}

function build(outputRoot) {
  if (fs.existsSync(outputRoot)) throw new Error("control root already exists");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const fixture = [];
  const gold = [];
  cases.forEach(([sourceText, relation, relationArguments, verdict, category], index) => {
    const item = candidate(sourceText, relation, relationArguments);
    const caseId = `pgr-${String(index + 1).padStart(2, "0")}`;
    fixture.push({ case_id: caseId, category, policy_identity: ACTIVE_GROUNDING_POLICY.identity, source_text: sourceText, candidate: item, candidate_sha256: sha256(canonicalJson(item)) });
    gold.push({ case_id: caseId, category, reviews: [{ assertion_index: 0, verdict }] });
  });
  const fixtureText = `${fixture.map(row => JSON.stringify(row)).join("\n")}\n`;
  const goldText = `${gold.map(row => JSON.stringify(row)).join("\n")}\n`;
  fs.writeFileSync(path.join(outputRoot, "fixture.jsonl"), fixtureText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "gold.jsonl"), goldText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "control.json"), `${JSON.stringify({
    schema_version: "memory-grounding-review-v2-policy-control-v1",
    cases: cases.length,
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    fixture_sha256: sha256(fixtureText),
    gold_sha256: sha256(goldText),
  }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

if (require.main === module) {
  const output = process.argv[2];
  if (!output) throw new Error("usage: node build-grounding-review-v2-policy-control.cjs OUTPUT_ROOT");
  build(path.resolve(output));
}

module.exports = { build, cases };
