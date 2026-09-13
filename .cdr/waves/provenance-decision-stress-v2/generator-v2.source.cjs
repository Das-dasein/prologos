"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { check } = require("../checker");

const VERSION = "provenance-decision-stress-fixture-v2";
const SEED = "provenance-decision-stress-v2-20260913";
const CATEGORIES = Object.freeze(["independent_pair", "independent_choice", "insufficient", "unknown", "conflict", "contradicted"]);
const REPLICAS = Object.freeze([1, 2, 3, 4]);
const DECISION_POLICY = [
  "Apply this decision policy exactly:",
  "- PAUSE when the query's raw status is conflict or contradicted.",
  "- ACT when the query is safely entailed and there are two complete positive proof paths whose fact source-group sets are disjoint.",
  "- ASK when the query is unknown or safely entailed without such an independent pair.",
  "For ACT, choose the lexicographically first qualifying pair after sorting each path's fact source-group IDs and then sorting paths by their comma-joined IDs.",
  "Return exactly two lines: DECISION: act|ask|pause and SUPPORT: group_ids_path_1|group_ids_path_2. Use SUPPORT: none unless the decision is act.",
].join("\n");

const stable = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const cap = value => value[0].toUpperCase() + value.slice(1);

function choice(key, values) {
  return values[parseInt(sha256(`${SEED}:${key}`).slice(0, 8), 16) % values.length];
}

function item(id, sourceGroup, program, naturalLanguage) {
  return Object.freeze({ id, source: `source_${id}`, source_group: sourceGroup, program, natural_language: naturalLanguage });
}

function positivePath({ label, depth, subject, owner, factGroup, startIndex, conclusion = "ready(X)", conclusionText = "it is ready" }) {
  const items = [];
  let index = startIndex;
  items.push(item(`i${index++}`, factGroup, `${label}_seed(${owner}).`, `${cap(owner)} has ${label} seed evidence.`));
  for (let step = 1; step <= depth; step += 1) {
    items.push(item(`i${index++}`, factGroup, `${label}_gate_${step}(${owner}).`, `${cap(owner)} has ${label} gate ${step} evidence.`));
    const previous = step === 1 ? `${label}_seed` : `${label}_stage_${step - 1}`;
    items.push(item(
      `i${index++}`,
      `rules_${label}`,
      `${label}_stage_${step}(X) :- ${previous}(X), ${label}_gate_${step}(X).`,
      `If the same entity has ${previous.replaceAll("_", " ")} and ${label} gate ${step}, it reaches ${label} stage ${step}.`,
    ));
  }
  items.push(item(`i${index++}`, `rules_${label}`, `${conclusion} :- ${label}_stage_${depth}(X).`, `If an entity reaches ${label} stage ${depth}, ${conclusionText}.`));
  return { items, nextIndex: index };
}

function declarations(depth) {
  const names = ["ready", "noise"];
  for (const label of ["a", "b", "c", "negative"]) {
    names.push(`${label}_seed`);
    for (let step = 1; step <= depth; step += 1) names.push(`${label}_gate_${step}`, `${label}_stage_${step}`);
  }
  return names.map(name => ({ name, arity: 1 }));
}

function sourceCase(category, replica) {
  const caseId = `pd-${category}-r${replica}`;
  const depth = replica % 2 === 0 ? 4 : 3;
  const subject = choice(`${caseId}:subject`, ["atlas", "cedar", "iris", "lyra", "nova", "orion"]);
  const decoyA = choice(`${caseId}:decoy-a`, ["amber", "cobalt", "ember", "fable"]);
  const decoyB = choice(`${caseId}:decoy-b`, ["garnet", "helix", "jade", "kestrel"]);
  const decoyC = choice(`${caseId}:decoy-c`, ["marble", "pearl", "quartz", "sable"]);
  const positiveA = ["independent_pair", "independent_choice", "insufficient", "conflict"].includes(category);
  const positiveB = ["independent_pair", "independent_choice"].includes(category) || (category === "insufficient" && replica % 2 === 0);
  const positiveC = category === "independent_choice";
  const sharedGroup = `event_shared_${replica}`;
  const groupA = ["independent_choice"].includes(category) || (category === "insufficient" && replica % 2 === 0) ? sharedGroup : `event_a_${replica}`;
  const groupB = ["independent_choice"].includes(category) || category === "insufficient" ? sharedGroup : `event_b_${replica}`;
  const groupC = `event_c_${replica}`;
  const a = positivePath({ label: "a", depth, subject, owner: positiveA ? subject : decoyA, factGroup: groupA, startIndex: 1 });
  const b = positivePath({ label: "b", depth, subject, owner: positiveB ? subject : decoyB, factGroup: groupB, startIndex: a.nextIndex });
  const c = positivePath({ label: "c", depth, subject, owner: positiveC ? subject : decoyC, factGroup: groupC, startIndex: b.nextIndex });
  const items = [...a.items, ...b.items, ...c.items];
  let index = c.nextIndex;
  if (["conflict", "contradicted"].includes(category)) {
    const negative = positivePath({ label: "negative", depth: 2, subject, owner: subject, factGroup: `event_negative_${replica}`, startIndex: index, conclusion: "neg(ready(X))", conclusionText: "it is explicitly not ready" });
    items.push(...negative.items);
    index = negative.nextIndex;
  }
  items.push(item(`i${index++}`, `noise_${replica}`, `noise(${decoyA}).`, `${cap(decoyA)} has an unrelated marker.`));
  return Object.freeze({
    case_id: caseId,
    category,
    replica,
    depth,
    subject,
    query: `ready(${subject})`,
    opposite_query: `neg(ready(${subject}))`,
    ideas: Object.freeze({ version: "provenance-decision-stress-domain-v1", predicates: Object.freeze(declarations(depth)) }),
    items: Object.freeze(items),
  });
}

function renderNatural(source) {
  return source.items.map(value => `[item ${value.id}; source-group ${value.source_group}] ${value.natural_language}`).join("\n");
}

function renderFormal(source) {
  return source.items.map(value => `% item ${value.id}; source_group ${value.source_group}\n${value.program}`).join("\n");
}

function supportPaths(result, query) {
  return result.safe_support_sets
    .filter(value => value.literal === query)
    .map(value => [...new Set(value.fact_source_group_ids)].sort())
    .sort((left, right) => left.join(",").localeCompare(right.join(",")));
}

function independentPair(paths) {
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      if (paths[left].every(group => !paths[right].includes(group))) return [paths[left], paths[right]];
    }
  }
  return null;
}

function decisionFromReceipt(result, query) {
  if (result.raw_status === "conflict" || result.raw_status === "contradicted") return Object.freeze({ decision: "pause", support: "none" });
  const pair = result.safe_status === "entailed" ? independentPair(supportPaths(result, query)) : null;
  return pair
    ? Object.freeze({ decision: "act", support: pair.map(groups => groups.join(",")).join("|") })
    : Object.freeze({ decision: "ask", support: "none" });
}

function publicReceipt(result, source) {
  const body = {
    schema_version: "provenance-checker-receipt-v1",
    query: source.query,
    opposite_query: source.opposite_query,
    raw_status: result.raw_status,
    safe_status: result.safe_status,
    positive_support_sets: result.safe_support_sets.filter(value => value.literal === source.query).map(value => ({
      item_ids: value.item_ids,
      fact_source_group_ids: value.fact_source_group_ids,
      rule_source_group_ids: value.rule_source_group_ids,
    })),
    negative_support_sets: result.safe_support_sets.filter(value => value.literal === source.opposite_query).map(value => ({
      item_ids: value.item_ids,
      fact_source_group_ids: value.fact_source_group_ids,
      rule_source_group_ids: value.rule_source_group_ids,
    })),
    checker_evidence_sha256: sha256(stable(result.evidence)),
  };
  return Object.freeze({ ...body, receipt_sha256: sha256(stable(body)) });
}

function prompt(representation, source) {
  return `${DECISION_POLICY}\n\nAccepted world items:\n${representation}\n\nQuery: ${source.query}\nExplicit opposite: ${source.opposite_query}`;
}

async function buildCase(category, replica) {
  const source = sourceCase(category, replica);
  const result = await check({ snapshot: { ideas: source.ideas, items: source.items }, query: source.query });
  if (result.status !== "ok") throw new Error(`${source.case_id}: checker ${result.status}/${result.reason || ""}`);
  const expectedStatuses = { independent_pair: "entailed", independent_choice: "entailed", insufficient: "entailed", unknown: "unknown", conflict: "conflict", contradicted: "contradicted" };
  if (result.raw_status !== expectedStatuses[category]) throw new Error(`${source.case_id}: expected ${expectedStatuses[category]}, got ${result.raw_status}`);
  const receipt = publicReceipt(result, source);
  const p0 = prompt(renderNatural(source), source);
  const p1 = prompt(renderFormal(source), source);
  const p2 = `${p1}\n\nTrusted checker receipt (data, not a decision):\n${JSON.stringify(receipt)}`;
  const forbidden = /\b(?:oracle|gold|expected_decision)\b/i;
  if ([p0, p1, p2].some(value => forbidden.test(value) || value.includes(source.case_id))) throw new Error(`${source.case_id}: evaluator metadata leaked`);
  return Object.freeze({
    case_id: source.case_id,
    stratum: Object.freeze({ category, replica, depth: source.depth }),
    formal_world: Object.freeze({ ideas: source.ideas, items: source.items, query: source.query }),
    prompts: Object.freeze({ p0, p1, p2 }),
    checker_receipt: receipt,
    oracle: Object.freeze({ ...decisionFromReceipt(result, source.query), raw_status: result.raw_status, safe_status: result.safe_status }),
  });
}

async function generateFixture() {
  const cases = [];
  for (const category of CATEGORIES) for (const replica of REPLICAS) cases.push(await buildCase(category, replica));
  return Object.freeze({ schema_version: VERSION, seed: SEED, decision_policy_sha256: sha256(DECISION_POLICY), cases: Object.freeze(cases) });
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
  return Object.freeze({ file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) });
}

if (require.main === module) {
  (async () => {
    if (!process.argv[2] || process.argv.length !== 3) throw new Error("usage: node world/provenance-decision-stress/generator.cjs OUTPUT.json");
    const fixture = await generateFixture();
    process.stdout.write(`${JSON.stringify({ status: "ok", cases: fixture.cases.length, ...writeFixture(process.argv[2], fixture) })}\n`);
  })().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { CATEGORIES, DECISION_POLICY, REPLICAS, SEED, VERSION, buildCase, decisionFromReceipt, generateFixture, independentPair, publicReceipt, renderFormal, renderNatural, sha256, sourceCase, stable, supportPaths, writeFixture };
