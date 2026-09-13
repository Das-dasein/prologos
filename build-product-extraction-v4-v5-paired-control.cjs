"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const assertion = (relation, args) => ({ polarity: "positive", relation, arguments: args, valid_from: null, valid_to: null });

const cases = [
  ["On most Fridays, I coach two new engineers.", "write", [assertion("role", ["user", "coach"])], "habitual_role"],
  ["I filled in as a coach once at yesterday's workshop.", "ignore", [], "isolated_role_action"],
  ["My employment contract is with Northstar.", "write", [assertion("works_at", ["user", "northstar"])], "direct_employment"],
  ["I attended a Northstar product demo yesterday.", "ignore", [], "organization_event"],
  ["Porto has been my home for several years.", "write", [assertion("lives_in", ["user", "porto"])], "direct_residence"],
  ["Yesterday I passed through Porto on a train.", "ignore", [], "transient_travel"],
  ["I am enrolled at Minerva University.", "write", [assertion("studies_at", ["user", "minerva_university"])], "direct_enrollment"],
  ["I toured Minerva University during an open day.", "ignore", [], "campus_visit"],
  ["I am proficient with Redis.", "write", [assertion("knows_technology", ["user", "redis"])], "direct_knowledge"],
  ["I watched one Redis tutorial this morning.", "ignore", [], "tutorial_only"],
  ["Rust was part of the system I built on my last project.", "write", [assertion("worked_with_technology", ["user", "rust"])], "past_technology_work"],
  ["I am considering Rust for a future prototype.", "ignore", [], "future_technology_consideration"],
  ["Docker is part of my daily workflow.", "write", [assertion("uses", ["user", "docker"])], "direct_use"],
  ["I may try Docker someday.", "ignore", [], "hypothetical_use"],
  ["My main research interest is temporal logic.", "write", [assertion("interested_in", ["user", "temporal_logic"])], "direct_interest"],
  ["A friend sent me an article about temporal logic.", "ignore", [], "mere_topic_encounter"],
  ["Atlas is one of the projects I worked on previously.", "write", [assertion("previous_project", ["user", "atlas"])], "direct_previous_project"],
  ["Atlas Labs is my employer.", "write", [assertion("works_at", ["user", "atlas_labs"])], "employment_not_project"],
  ["The company that employs me is Acme.", "write", [assertion("works_at", ["user", "acme"])], "ascii_normalization"],
  ["Я работаю в Кэндзи.", "clarify", [], "unadmitted_transliteration"],
];

function build(outputRoot) {
  if (fs.existsSync(outputRoot)) throw new Error("control root already exists");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const fixture = cases.map(([sourceText, , , category], index) => ({
    case_id: `pv-${String(index + 1).padStart(2, "0")}`,
    category,
    source_text: sourceText,
    condition_order: index % 2 === 0 ? ["v4", "v5"] : ["v5", "v4"],
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
  }));
  const gold = cases.map(([, expectedDecision, assertions, category], index) => ({
    case_id: `pv-${String(index + 1).padStart(2, "0")}`,
    category,
    expected_decision: expectedDecision,
    assertions,
  }));
  const fixtureText = `${fixture.map(row => JSON.stringify(row)).join("\n")}\n`;
  const goldText = `${gold.map(row => JSON.stringify(row)).join("\n")}\n`;
  fs.writeFileSync(path.join(outputRoot, "fixture.jsonl"), fixtureText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "gold.jsonl"), goldText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "control.json"), `${JSON.stringify({
    schema_version: "product-extraction-v4-v5-paired-control-v1",
    cases: cases.length,
    provider_calls: cases.length * 2,
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    fixture_sha256: sha256(fixtureText),
    gold_sha256: sha256(goldText),
  }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error("usage: node build-product-extraction-v4-v5-paired-control.cjs OUTPUT_ROOT");
  build(path.resolve(process.argv[2]));
}

module.exports = { build, cases };
