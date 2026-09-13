#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("../agent");
const { check } = require("../checker");

const VERSION = "temporal-reasoning-stress-fixture-v1";
const SEED = "temporal-reasoning-stress-v1-20260913";
const DEPTHS = [3, 5, 8];
const TOPOLOGIES = ["chain", "join"];
const LOCI = ["seed_fact", "bridge_rule"];
const TRANSITIONS = ["positive_to_negative", "negative_to_positive", "withdrawal"];
const ANSWER = "Return exactly two lines. Line 1: STATUS: entailed, contradicted, unknown, or conflict. Line 2: SUPPORT: sorted comma-separated item IDs, or SUPPORT: none.";

const stable = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const cap = value => value[0].toUpperCase() + value.slice(1);
const negate = literal => literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`;

function choice(key, values) { return values[parseInt(sha256(`${SEED}:${key}`).slice(0, 8), 16) % values.length]; }
function clause(id, program, natural_language) { return { id, program, natural_language }; }

function caseSpec(depth, topology, locus, transition, ordinal) {
  const caseId = `trs-d${depth}-${topology}-${locus}-${transition}`;
  const ns = `tr${String(ordinal).padStart(3, "0")}`;
  const subject = choice(`${caseId}:subject`, ["atlas", "cedar", "iris", "lyra", "nova", "orion"]);
  const decoy = choice(`${caseId}:decoy`, ["amber", "cobalt", "ember", "fable", "garnet", "helix"]);
  const approvalRoute = choice(`${caseId}:approval-route`, ["a", "b"]);
  const signalRoute = choice(`${caseId}:signal-route`, ["a", "b"]);
  return { case_id: caseId, namespace: ns, subject, decoy, approval_route: approvalRoute, signal_route: signalRoute, stratum: { depth, topology, locus, transition } };
}

const otherRoute = route => route === "a" ? "b" : "a";
const routeName = route => route === "a" ? "amber" : "cobalt";

function branch(spec, route) {
  const { namespace: ns, subject, stratum: { depth, topology, locus } } = spec;
  const fixed = [], start = 2;
  for (let stage = start; stage < depth; stage += 1) {
    const previous = `${ns}_route_${route}_stage_${stage - 1}`, current = `${ns}_route_${route}_stage_${stage}`;
    if (topology === "join") {
      const gate = `${ns}_route_${route}_gate_${stage}`;
      fixed.push(clause(`${ns}_route_${route}_gate_${stage}`, `${gate}(${subject}).`, `${cap(subject)} has the ${routeName(route)} gate for stage ${stage}.`));
      fixed.push(clause(`${ns}_route_${route}_rule_${stage}`, `${current}(X) :- ${previous}(X), ${gate}(X).`, `If the same entity is on the ${routeName(route)} route at stage ${stage - 1} and has its ${routeName(route)} gate for stage ${stage}, it reaches stage ${stage} on that route.`));
    } else fixed.push(clause(`${ns}_route_${route}_rule_${stage}`, `${current}(X) :- ${previous}(X).`, `If an entity is on the ${routeName(route)} route at stage ${stage - 1}, it reaches stage ${stage} on that route.`));
  }
  const prior = `${ns}_route_${route}_stage_${depth - 1}`;
  const approves = route === spec.approval_route;
  const head = approves ? `${ns}_approved(X)` : `neg(${ns}_approved(X))`;
  fixed.push(clause(`${ns}_route_${route}_conclusion`, `${head} :- ${prior}(X).`, `If an entity reaches stage ${depth - 1} on the ${routeName(route)} route, ${approves ? "it is approved" : "its approval is denied"}.`));
  return fixed;
}

function sourceWorld(spec, dependencies = true) {
  const { namespace: ns, subject, decoy, stratum: { depth, topology, locus, transition } } = spec;
  const oldOutcome = transition === "negative_to_positive" ? "denied" : "approved";
  const newOutcome = oldOutcome === "approved" ? "denied" : "approved";
  const routeFor = outcome => outcome === "approved" ? spec.approval_route : otherRoute(spec.approval_route);
  const fixed = [...branch(spec, "a"), ...branch(spec, "b")];
  if (locus === "bridge_rule") {
    fixed.unshift(clause(`${ns}_base`, `${ns}_base(${subject}).`, `${cap(subject)} has the base signal.`));
    fixed.push(clause(`${ns}_decoy_base`, `${ns}_base(${decoy}).`, `${cap(decoy)} has an unrelated base signal.`));
  } else fixed.push(clause(`${ns}_decoy_signal`, `${ns}_signal(${decoy}).`, `${cap(decoy)} has an unrelated signal.`));
  const changedProgram = outcome => {
    const route = routeFor(outcome);
    if (locus === "bridge_rule") return `${ns}_route_${route}_stage_1(X) :- ${ns}_base(X).`;
    return route === spec.signal_route ? `${ns}_signal(${subject}).` : `neg(${ns}_signal(${subject})).`;
  };
  const changedNatural = outcome => {
    const route = routeFor(outcome);
    if (locus === "bridge_rule") return `For every entity, having the base signal places it on the ${routeName(route)} route at stage 1.`;
    return `${cap(subject)}'s source signal is ${route === spec.signal_route ? "present" : "explicitly denied"}.`;
  };
  if (locus === "seed_fact") {
    const presentRoute = spec.signal_route, deniedRoute = otherRoute(presentRoute);
    fixed.unshift(clause(`${ns}_route_${presentRoute}_rule_1`, `${ns}_route_${presentRoute}_stage_1(X) :- ${ns}_signal(X).`, `If an entity's source signal is present, it enters the ${routeName(presentRoute)} route at stage 1.`));
    fixed.unshift(clause(`${ns}_route_${deniedRoute}_rule_1`, `${ns}_route_${deniedRoute}_stage_1(X) :- neg(${ns}_signal(X)).`, `If an entity's source signal is explicitly denied, it enters the ${routeName(deniedRoute)} route at stage 1.`));
  }
  const oldItem = clause(`${ns}_origin_old`, changedProgram(oldOutcome), changedNatural(oldOutcome));
  const copyItem = { ...clause(`${ns}_mirror_copy`, oldItem.program, `The mirror repeats this assertion exactly: ${oldItem.natural_language}`), ...(dependencies ? { dependsOn: [oldItem.id] } : {}) };
  const newItem = transition === "withdrawal"
    ? clause(`${ns}_origin_withdrawal`, `${ns}_withdrawn(${ns}_case).`, `The origin withdraws item ${oldItem.id} and provides no replacement assertion.`)
    : clause(`${ns}_origin_new`, changedProgram(newOutcome), `The origin replaces item ${oldItem.id}. ${changedNatural(newOutcome)}`);
  newItem.replaces = oldItem.id;
  const predicateNames = new Set([`${ns}_approved`, `${ns}_withdrawn`, `${ns}_base`, `${ns}_signal`]);
  for (const item of [...fixed, oldItem, copyItem, newItem]) {
    for (const match of item.program.matchAll(/(?:neg\()?([a-z][a-z0-9_]*)\(/g)) predicateNames.add(match[1]);
  }
  const ideas = { version: `${VERSION}:${ns}`, predicates: [...predicateNames].sort().map(name => ({ name, arity: 1 })) };
  return { ...spec, ideas, fixed, oldItem, copyItem, newItem, query: `${ns}_approved(${subject})`, natural_question: `Is ${cap(subject)} approved?` };
}

async function admit(agent, sourceText, items, at, sourceGroup, lineage) {
  const source = agent.observe(sourceText, { at, sourceGroup, sourceGroupAttestation: { by: "temporal_reasoning_generator_v1", reason: "deterministic generated source", lineage_id: lineage } });
  const proposal = agent.propose(source, items, { at });
  await agent.admit(proposal, { admit: true, by: "temporal_reasoning_generator_v1", reason: "deterministic generated benchmark world" });
}

async function executeWorld(world, dependencies) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `pam-trs-${dependencies ? "dep" : "ablation"}-`));
  try {
    const agent = new WorldAgent(directory, { agent_id: `${world.namespace}-${dependencies ? "dep" : "ablation"}`, ideas: world.ideas, startTime: 0 });
    await admit(agent, "Stable rules and decoys", world.fixed, 0, `${world.namespace}_stable`, `${world.namespace}_stable`);
    await admit(agent, world.oldItem.natural_language, [world.oldItem], 0, `${world.namespace}_origin`, `${world.namespace}_origin`);
    const copy = dependencies ? world.copyItem : { ...world.copyItem, dependsOn: undefined };
    await admit(agent, copy.natural_language, [copy], 0, `${world.namespace}_mirror`, `${world.namespace}_origin`);
    await admit(agent, world.newItem.natural_language, [world.newItem], 1, `${world.namespace}_origin`, `${world.namespace}_origin`);
    const before = agent.snapshot(), restored = new WorldAgent(directory), snapshot = restored.snapshot();
    if (before.sha256 !== snapshot.sha256) throw new Error(`${world.case_id}: restart changed snapshot`);
    const result = await check({ snapshot, query: world.query });
    if (result.status !== "ok") throw new Error(`${world.case_id}: checker ${result.status}`);
    return { snapshot, result };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function supportFor(result, query) {
  const literal = result.raw_status === "contradicted" ? negate(query) : query;
  if (result.raw_status === "unknown") return [];
  const sets = result.raw_support_sets.filter(entry => entry.literal === literal).map(entry => [...entry.item_ids].sort());
  if (sets.length !== 1) throw new Error(`expected one minimal support for ${literal}, got ${sets.length}`);
  return sets[0];
}

function renderNatural(world) {
  const fixed = world.fixed.map(item => `[${item.id}] ${item.natural_language}`).join("\n");
  return `Revision 0 stable knowledge:\n${fixed}\n[${world.oldItem.id}] ${world.oldItem.natural_language}\n[${world.copyItem.id}] ${world.copyItem.natural_language} It depends on [${world.oldItem.id}].\nRevision 1:\n[${world.newItem.id}] ${world.newItem.natural_language}\nThe agent restarts. Replaced items and copies whose named dependency is inactive cannot support the answer.`;
}

function renderFormal(world) {
  const line = (item, event) => JSON.stringify({ event, id: item.id, program: item.program, ...(item.dependsOn ? { dependsOn: item.dependsOn } : {}), ...(item.replaces ? { replaces: item.replaces } : {}) });
  return [...world.fixed.map(item => line(item, "admit@0")), line(world.oldItem, "admit@0"), line(world.copyItem, "admit@0"), line(world.newItem, "admit@1"), JSON.stringify({ event: "restart@1", projection: "remove replaced items, then transitively remove items with inactive dependsOn" })].join("\n");
}

function prompt(representation, query) { return `You are given a finite persistent signed-Horn memory. Explicit negation is independent; absence is unknown. Apply replacement and dependency projection before reasoning.\n${representation}\nQUERY: ${query}\n${ANSWER}`; }

async function buildCase(spec) {
  const world = sourceWorld(spec, true), current = await executeWorld(world, true), ablation = await executeWorld(world, false);
  const expected = spec.stratum.transition === "positive_to_negative" ? "contradicted" : spec.stratum.transition === "negative_to_positive" ? "entailed" : "unknown";
  if (current.result.raw_status !== expected) throw new Error(`${spec.case_id}: expected ${expected}, got ${current.result.raw_status}`);
  const expectedAblation = spec.stratum.transition === "withdrawal" ? "entailed" : "conflict";
  if (ablation.result.raw_status !== expectedAblation) throw new Error(`${spec.case_id}: ablation expected ${expectedAblation}, got ${ablation.result.raw_status}`);
  const support = supportFor(current.result, world.query), rules = current.snapshot.items.filter(item => support.includes(item.id) && item.program.includes(":-")).length;
  if (expected !== "unknown" && rules !== spec.stratum.depth) throw new Error(`${spec.case_id}: expected depth ${spec.stratum.depth}, got ${rules}`);
  const natural = renderNatural(world), formal = renderFormal(world);
  const receipt = { version: "temporal-signed-horn-receipt-v1", snapshot_sha256: current.snapshot.sha256, query: world.query, raw_status: current.result.raw_status, support_item_ids: support };
  return {
    case_id: spec.case_id,
    stratum: spec.stratum,
    formal_world: { ideas: world.ideas, fixed: world.fixed, old_item: world.oldItem, copy_item: world.copyItem, new_item: world.newItem, query: world.query },
    renderings: { natural, formal },
    prompts: { p0: prompt(natural, world.natural_question), p1: prompt(formal, world.query), p2: `${prompt(formal, world.query)}\nTRUSTED CHECKER RECEIPT:\n${JSON.stringify(receipt)}` },
    checker_receipt: receipt,
    oracle: { status: current.result.raw_status, support_item_ids: support, measured_rule_depth: rules },
    scorer_only: { no_dependency_status: ablation.result.raw_status, no_dependency_active_item_ids: ablation.snapshot.items.map(item => item.id) },
  };
}

async function generateFixture() {
  const cases = []; let ordinal = 1;
  for (const depth of DEPTHS) for (const topology of TOPOLOGIES) for (const locus of LOCI) for (const transition of TRANSITIONS) cases.push(await buildCase(caseSpec(depth, topology, locus, transition, ordinal++)));
  return { schema_version: VERSION, seed: SEED, design: { depths: DEPTHS, topologies: TOPOLOGIES, loci: LOCI, transitions: TRANSITIONS }, cases };
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: "wx" });
  return { file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
}

if (require.main === module) generateFixture().then(fixture => {
  const output = process.argv[2]; if (!output || process.argv.length !== 3) throw new Error("usage: node generator.cjs OUTPUT.json");
  process.stdout.write(`${JSON.stringify({ status: "ok", cases: fixture.cases.length, ...writeFixture(output, fixture) })}\n`);
}).catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });

module.exports = { ANSWER, DEPTHS, LOCI, SEED, TOPOLOGIES, TRANSITIONS, VERSION, buildCase, caseSpec, executeWorld, generateFixture, renderFormal, renderNatural, sourceWorld, stable, supportFor, writeFixture };
