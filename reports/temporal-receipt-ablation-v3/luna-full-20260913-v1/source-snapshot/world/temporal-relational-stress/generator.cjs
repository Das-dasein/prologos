#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("../agent");
const { check } = require("../checker");

const VERSION = "temporal-relational-stress-fixture-v2";
const SEED = "temporal-relational-stress-v2-20260913";
const DEPTHS = [4, 7];
const TOPOLOGIES = ["relational_chain_of_joins", "relational_diamond"];
const REVISION_COUNTS = [2, 4];
const STATUSES = ["entailed", "contradicted", "unknown", "conflict"];
const CONDITIONS = ["P0", "P1", "P1F", "P2"];
const ENTITY_NAMES = ["arun", "bela", "cato", "dara", "elio", "fara", "gilo", "hana", "ivo", "juna", "kato", "lina"];

const stable = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const cap = value => value[0].toUpperCase() + value.slice(1);
const negate = literal => literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`;
const choice = (key, values) => values[parseInt(sha256(`${SEED}:${key}`).slice(0, 8), 16) % values.length];
const other = route => route === "a" ? "b" : "a";
const routeName = route => route === "a" ? "amber" : "cobalt";
const pathName = (route, variant) => variant === "core" ? routeName(route) : `${routeName(route)} ${variant === "east" ? "linen" : "opal"}`;

function caseSpec(depth, topology, revisionCount, status, ordinal) {
  const caseId = `trv2-d${depth}-${topology.replace("relational_", "")}-r${revisionCount}-${status}`;
  const namespace = `tv${String(ordinal).padStart(3, "0")}`;
  return { case_id: caseId, namespace, approval_route: choice(`${caseId}:approval`, ["a", "b"]), stratum: { depth, topology, revision_count: revisionCount, status } };
}

function makeBuilder(spec) {
  const signatures = new Map();
  const symbol = role => `${spec.namespace}_${sha256(`${SEED}:${spec.case_id}:predicate:${role}`).slice(0, 7)}`;
  const itemId = role => `${spec.namespace}_i_${sha256(`${SEED}:${spec.case_id}:item:${role}`).slice(0, 7)}`;
  const entity = (route, variant, index) => {
    if (index === spec.stratum.depth - 1) return choice(`${spec.case_id}:target`, ENTITY_NAMES);
    const offset = parseInt(sha256(`${SEED}:${spec.case_id}:${route}:${variant}`).slice(0, 6), 16);
    return ENTITY_NAMES[(offset + index) % ENTITY_NAMES.length];
  };
  const register = entries => { for (const [name, arity] of entries) signatures.set(`${name}/${arity}`, { name, arity }); };
  const clause = (role, program, natural_language, entries) => { register(entries); return { id: itemId(role), program, natural_language }; };
  return { clause, entity, itemId, signatures, symbol };
}

function pathFamily(spec, builder, route, variant) {
  const { depth } = spec.stratum;
  const c = builder.clause, s = builder.symbol;
  const entry = s(`${route}:${variant}:entry`), marker = s(`${route}:${variant}:marker`);
  const stages = Array.from({ length: depth }, (_, index) => s(`${route}:${variant}:stage:${index}`));
  const items = [];
  const nodes = Array.from({ length: depth }, (_, index) => builder.entity(route, variant, index));
  const label = pathName(route, variant);
  items.push(c(`${route}:${variant}:entry-fact`, `${entry}(${nodes[0]},${nodes[1]}).`, `${cap(nodes[0])} has the ${label} entry relation to ${cap(nodes[1])}.`, [[entry, 2]]));
  items.push(c(`${route}:${variant}:marker-fact`, `${marker}(${nodes[1]}).`, `${cap(nodes[1])} carries the ${label} entry marker.`, [[marker, 1]]));
  for (let stage = 2; stage < depth; stage += 1) {
    const link = s(`${route}:${variant}:link:${stage}`), gate = s(`${route}:${variant}:gate:${stage}`);
    const from = stage === 2 ? nodes[0] : nodes[stage - 1], to = nodes[stage];
    items.push(c(`${route}:${variant}:link-fact:${stage}`, `${link}(${from},${to}).`, `${cap(from)} has the ${label} transfer relation to ${cap(to)} for stage ${stage}.`, [[link, 2]]));
    items.push(c(`${route}:${variant}:gate-fact:${stage}`, `${gate}(${to}).`, `${cap(to)} carries the ${label} gate for stage ${stage}.`, [[gate, 1]]));
    items.push(c(`${route}:${variant}:rule:${stage}`, `${stages[stage]}(Y) :- ${stages[stage - 1]}(X), ${link}(X,Y), ${gate}(Y).`, `If an entity is at stage ${stage - 1} of the ${label} route, and it has that route's stage-${stage} transfer relation to a gated entity, then the latter entity reaches stage ${stage}.`, [[stages[stage], 1], [stages[stage - 1], 1], [link, 2], [gate, 1]]));
  }
  const queryPredicate = s("query"), approves = route === spec.approval_route;
  items.push(c(`${route}:${variant}:conclusion`, `${approves ? "" : "neg("}${queryPredicate}(X)${approves ? "" : ")"} :- ${stages[depth - 1]}(X).`, `If an entity reaches stage ${depth - 1} of the ${label} route, ${approves ? "it is approved" : "its approval is explicitly denied"}.`, [[queryPredicate, 1], [stages[depth - 1], 1]]));
  const bridgeProgram = `${stages[1]}(X) :- ${entry}(X,Y), ${marker}(Y).`;
  const bridgeNatural = `If an entity has the ${label} entry relation to an entity carrying that route's entry marker, the first entity reaches stage 1 of the ${label} route.`;
  builder.signatures.set(`${stages[1]}/1`, { name: stages[1], arity: 1 });
  return { items, bridgeProgram, bridgeNatural, target: nodes[depth - 1] };
}

function sourceWorld(spec, dependencies = true) {
  const b = makeBuilder(spec), topology = spec.stratum.topology;
  const variants = topology === "relational_diamond" ? ["east", "west"] : ["core"];
  const families = {};
  for (const route of ["a", "b"]) for (const variant of variants) families[`${route}:${variant}`] = pathFamily(spec, b, route, variant);
  const target = families[`a:${variants[0]}`].target;
  if (["a", "b"].some(route => families[`${route}:${variants.at(-1)}`].target !== target)) throw new Error(`${spec.case_id}: routes do not share query target`);
  const activeRoutes = new Set(spec.stratum.status === "entailed" ? [spec.approval_route] : spec.stratum.status === "contradicted" ? [other(spec.approval_route)] : spec.stratum.status === "conflict" ? ["a", "b"] : []);
  const fixed = Object.values(families).flatMap(family => family.items);
  const origins = [], copies = [], replacements = [];
  for (const route of ["a", "b"]) {
    const oldFamily = families[`${route}:${variants[0]}`], newFamily = families[`${route}:${variants.at(-1)}`];
    const oldItem = b.clause(`${route}:origin-old`, oldFamily.bridgeProgram, oldFamily.bridgeNatural, []);
    const copyItem = { ...b.clause(`${route}:mirror-copy`, oldItem.program, `A mirror repeats this rule exactly: ${oldItem.natural_language}`, []), ...(dependencies ? { dependsOn: [oldItem.id] } : {}) };
    const newItem = activeRoutes.has(route)
      ? b.clause(`${route}:origin-new`, newFamily.bridgeProgram, `The source replaces [${oldItem.id}] with this rule: ${newFamily.bridgeNatural}`, [])
      : b.clause(`${route}:origin-withdrawal`, `${b.symbol(`${route}:withdrawn`)}(${spec.namespace}_record).`, `The source withdraws [${oldItem.id}] and supplies no replacement rule.`, [[b.symbol(`${route}:withdrawn`), 1]]);
    newItem.replaces = oldItem.id;
    origins.push({ route, item: oldItem, source_group: `${spec.namespace}_source_${route}` });
    copies.push({ route, item: copyItem, source_group: `${spec.namespace}_mirror_${route}` });
    replacements.push({ route, item: newItem, source_group: `${spec.namespace}_source_${route}` });
  }
  const decoyChanges = [];
  if (spec.stratum.revision_count === 4) for (const label of ["c", "d"]) {
    const predicate = b.symbol(`decoy:${label}`), left = choice(`${spec.case_id}:decoy:${label}:left`, ENTITY_NAMES), right = choice(`${spec.case_id}:decoy:${label}:right`, ENTITY_NAMES);
    const oldItem = b.clause(`decoy:${label}:old`, `${predicate}(${left},${right}).`, `${cap(left)} has an unrelated ${label === "c" ? "silver" : "violet"} relation to ${cap(right)}.`, [[predicate, 2]]);
    const copyItem = { ...b.clause(`decoy:${label}:copy`, oldItem.program, `A decoy mirror repeats [${oldItem.id}] exactly.`, []), ...(dependencies ? { dependsOn: [oldItem.id] } : {}) };
    const tomb = b.symbol(`decoy:${label}:withdrawn`), newItem = b.clause(`decoy:${label}:new`, `${tomb}(${spec.namespace}_record).`, `The decoy source withdraws [${oldItem.id}].`, [[tomb, 1]]);
    newItem.replaces = oldItem.id;
    decoyChanges.push({ label, oldItem, copyItem, newItem, source_group: `${spec.namespace}_source_${label}` });
  }
  const changes = spec.stratum.revision_count === 2
    ? [replacements[0], replacements[1]]
    : [replacements[0], { item: decoyChanges[0].newItem, source_group: decoyChanges[0].source_group }, replacements[1], { item: decoyChanges[1].newItem, source_group: decoyChanges[1].source_group }];
  const query = `${b.symbol("query")}(${target})`;
  return { ...spec, ideas: { version: `${VERSION}:${spec.namespace}`, predicates: [...b.signatures.values()].sort((x, y) => `${x.name}/${x.arity}`.localeCompare(`${y.name}/${y.arity}`)) }, fixed: fixed.sort((x, y) => sha256(x.id).localeCompare(sha256(y.id))), origins, copies, replacements, decoyChanges, changes, query, natural_question: `Is ${cap(target)} approved?` };
}

async function admit(agent, text, items, at, sourceGroup) {
  const source = agent.observe(text, { at, sourceGroup, sourceGroupAttestation: { by: "temporal_relational_generator_v2", reason: "deterministic generated source", lineage_id: sourceGroup } });
  const proposal = agent.propose(source, items, { at });
  await agent.admit(proposal, { admit: true, by: "temporal_relational_generator_v2", reason: "deterministic generated benchmark world" });
}

async function executeWorld(world, dependencies) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `pam-trv2-${dependencies ? "dep" : "ablation"}-`));
  try {
    const agent = new WorldAgent(directory, { agent_id: `${world.namespace}-${dependencies ? "dep" : "ablation"}`, ideas: world.ideas, startTime: 0 });
    await admit(agent, "Stable relational rules and facts", world.fixed, 0, `${world.namespace}_stable`);
    for (const origin of world.origins) await admit(agent, origin.item.natural_language, [origin.item], 0, origin.source_group);
    for (const copy of world.copies) {
      const item = dependencies ? copy.item : { ...copy.item, dependsOn: undefined };
      await admit(agent, item.natural_language, [item], 0, copy.source_group);
    }
    for (const decoy of world.decoyChanges) {
      await admit(agent, decoy.oldItem.natural_language, [decoy.oldItem], 0, decoy.source_group);
      const item = dependencies ? decoy.copyItem : { ...decoy.copyItem, dependsOn: undefined };
      await admit(agent, item.natural_language, [item], 0, `${world.namespace}_mirror_${decoy.label}`);
    }
    for (let index = 0; index < world.changes.length; index += 1) await admit(agent, world.changes[index].item.natural_language, [world.changes[index].item], index + 1, world.changes[index].source_group);
    const before = agent.snapshot(), restored = new WorldAgent(directory), snapshot = restored.snapshot();
    if (before.sha256 !== snapshot.sha256) throw new Error(`${world.case_id}: restart changed snapshot`);
    const result = await check({ snapshot, query: world.query });
    if (result.status !== "ok") throw new Error(`${world.case_id}: checker ${result.status}`);
    return { snapshot, result };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function querySupport(result, query) {
  const forLiteral = literal => result.raw_support_sets.filter(entry => entry.literal === literal).map(entry => [...entry.item_ids].sort()).sort((a, b) => a.join(",").localeCompare(b.join(",")));
  return { positive: forLiteral(query), negative: forLiteral(negate(query)) };
}

function renderNatural(world) {
  const lines = ["Revision 0 stable knowledge:", ...world.fixed.map(item => `[${item.id}] ${item.natural_language}`)];
  for (const origin of world.origins) lines.push(`[${origin.item.id}] ${origin.item.natural_language}`);
  for (const copy of world.copies) lines.push(`[${copy.item.id}] ${copy.item.natural_language} It depends on [${copy.item.dependsOn[0]}].`);
  for (const decoy of world.decoyChanges) {
    lines.push(`[${decoy.oldItem.id}] ${decoy.oldItem.natural_language}`);
    lines.push(`[${decoy.copyItem.id}] ${decoy.copyItem.natural_language} It depends on [${decoy.copyItem.dependsOn[0]}].`);
  }
  world.changes.forEach((change, index) => lines.push(`Revision ${index + 1}: [${change.item.id}] ${change.item.natural_language}`));
  lines.push("The agent restarts. Replaced items and every copy whose named dependency is inactive are removed before reasoning.");
  return lines.join("\n");
}

function renderFormal(world) {
  const line = (item, event) => JSON.stringify({ event, id: item.id, program: item.program, ...(item.dependsOn ? { dependsOn: item.dependsOn } : {}), ...(item.replaces ? { replaces: item.replaces } : {}) });
  const rows = [...world.fixed.map(item => line(item, "admit@0")), ...world.origins.map(entry => line(entry.item, "admit@0")), ...world.copies.map(entry => line(entry.item, "admit@0"))];
  for (const decoy of world.decoyChanges) rows.push(line(decoy.oldItem, "admit@0"), line(decoy.copyItem, "admit@0"));
  world.changes.forEach((change, index) => rows.push(line(change.item, `admit@${index + 1}`)));
  rows.push(JSON.stringify({ event: `restart@${world.changes.length}`, projection: "remove replaced items, then transitively remove items with inactive dependsOn" }));
  return rows.join("\n");
}

function renderFlat(snapshot) { return snapshot.items.map(item => JSON.stringify({ id: item.id, program: item.program })).join("\n"); }
const answerContract = "Return exactly one JSON object with keys status, positive_support_sets, negative_support_sets. The status value must be exactly one of entailed, contradicted, unknown, or conflict. Each support set is a sorted array of item IDs; sort the list of sets lexicographically. Use empty lists when absent. Do not add markdown or explanation.";
const prompt = (representation, query) => `Reason over this finite persistent signed-Horn memory. Explicit negation is independent; absence is unknown. Apply replacement and dependency projection before logical inference.\n${representation}\nQUERY: ${query}\n${answerContract}`;
const flatPrompt = (representation, query) => `Reason over this final active signed-Horn snapshot. Explicit negation is independent; absence is unknown. Replacement and dependency projection have already been applied; perform only logical inference over the listed clauses.\n${representation}\nQUERY: ${query}\n${answerContract}`;

async function buildCase(spec) {
  const world = sourceWorld(spec, true), current = await executeWorld(world, true), ablation = await executeWorld(sourceWorld(spec, false), false);
  if (current.result.raw_status !== spec.stratum.status) throw new Error(`${spec.case_id}: expected ${spec.stratum.status}, got ${current.result.raw_status}`);
  const supports = querySupport(current.result, world.query), expectedCounts = { entailed: [1, 0], contradicted: [0, 1], unknown: [0, 0], conflict: [1, 1] }[spec.stratum.status];
  if (supports.positive.length !== expectedCounts[0] || supports.negative.length !== expectedCounts[1]) throw new Error(`${spec.case_id}: support multiplicity mismatch`);
  const ruleDepths = [...supports.positive, ...supports.negative].map(set => current.snapshot.items.filter(item => set.includes(item.id) && item.program.includes(":-")).length);
  if (ruleDepths.some(depth => depth !== spec.stratum.depth)) throw new Error(`${spec.case_id}: measured depth mismatch ${ruleDepths}`);
  for (const support of [...supports.positive, ...supports.negative]) {
    const programs = current.snapshot.items.filter(item => support.includes(item.id)).map(item => item.program);
    const crossEntityFacts = programs.filter(program => {
      const match = program.match(/^[a-z][a-z0-9_]*\(([a-z][a-z0-9_]*),([a-z][a-z0-9_]*)\)\.$/);
      return match && match[1] !== match[2];
    });
    if (crossEntityFacts.length < 2) throw new Error(`${spec.case_id}: proof does not traverse enough cross-entity relations`);
    if (!world.replacements.some(entry => support.includes(entry.item.id))) throw new Error(`${spec.case_id}: proof does not depend on a current revision`);
  }
  if (ablation.result.raw_status !== "conflict") throw new Error(`${spec.case_id}: no-dependency ablation expected conflict, got ${ablation.result.raw_status}`);
  const inactiveIds = [...world.origins.map(entry => entry.item.id), ...world.copies.map(entry => entry.item.id), ...world.decoyChanges.flatMap(entry => [entry.oldItem.id, entry.copyItem.id])];
  if (inactiveIds.some(id => current.snapshot.items.some(item => item.id === id))) throw new Error(`${spec.case_id}: replaced or dependent item survived projection`);
  if (spec.stratum.status === "unknown") for (const origin of world.origins) {
    const result = await check({ snapshot: current.snapshot, query: world.query, assumptions: [{ ...origin.item, id: `${origin.item.id}_probe`, source: `${origin.item.id}_probe`, source_group: `${origin.item.id}_probe` }] });
    const expected = origin.route === spec.approval_route ? "entailed" : "contradicted";
    if (result.status !== "ok" || result.raw_status !== expected) throw new Error(`${spec.case_id}: unknown world is not exactly one bridge from ${expected}`);
  }
  const natural = renderNatural(world), formal = renderFormal(world), flat = renderFlat(current.snapshot);
  const receipt = { version: "temporal-relational-receipt-v2", snapshot_sha256: current.snapshot.sha256, query: world.query, status: current.result.raw_status, positive_support_sets: supports.positive, negative_support_sets: supports.negative };
  const prompts = { p0: prompt(natural, world.natural_question), p1: prompt(formal, world.query), p1f: flatPrompt(flat, world.query) };
  prompts.p2 = `${prompts.p1}\nTRUSTED CHECKER RECEIPT:\n${JSON.stringify(receipt)}`;
  for (const [condition, value] of Object.entries(prompts)) {
    if (value.includes(spec.case_id) || value.includes(`\"status\":\"${spec.stratum.status}\"`) && condition !== "p2") throw new Error(`${spec.case_id}: prompt leak in ${condition}`);
  }
  const activeItems = current.snapshot.items.map(({ id, source, source_group, program }) => ({ id, source, source_group, program }));
  return { case_id: spec.case_id, stratum: spec.stratum, formal_world: { ideas: world.ideas, active_items: activeItems, query: world.query }, renderings: { natural, formal, flat }, prompts, checker_receipt: receipt, oracle: { status: current.result.raw_status, positive_support_sets: supports.positive, negative_support_sets: supports.negative, measured_rule_depths: ruleDepths }, scorer_only: { active_item_ids: activeItems.map(item => item.id), active_snapshot_sha256: current.snapshot.sha256, no_dependency_status: ablation.result.raw_status } };
}

async function generateFixture() {
  const cases = []; let ordinal = 1;
  for (const depth of DEPTHS) for (const topology of TOPOLOGIES) for (const revisionCount of REVISION_COUNTS) for (const status of STATUSES) cases.push(await buildCase(caseSpec(depth, topology, revisionCount, status, ordinal++)));
  return { schema_version: VERSION, seed: SEED, design: { depths: DEPTHS, topologies: TOPOLOGIES, revision_counts: REVISION_COUNTS, statuses: STATUSES, conditions: CONDITIONS }, cases };
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: "wx" });
  return { file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
}

if (require.main === module) generateFixture().then(fixture => {
  const output = process.argv[2]; if (!output || process.argv.length !== 3) throw new Error("usage: node generator.cjs OUTPUT.json");
  process.stdout.write(`${JSON.stringify({ status: "ok", cases: fixture.cases.length, ...writeFixture(output, fixture) })}\n`);
}).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { CONDITIONS, DEPTHS, REVISION_COUNTS, SEED, STATUSES, TOPOLOGIES, VERSION, buildCase, caseSpec, executeWorld, generateFixture, querySupport, renderFlat, renderFormal, renderNatural, sourceWorld, stable, writeFixture };
