'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { check } = require('../checker');

const VERSION = 'reasoning-stress-fixture-v1';
const SEED = 'reasoning-stress-v1-20260913';
const DEPTHS = [3, 6];
const TOPOLOGIES = ['chain', 'join'];
const STATUSES = ['entailed', 'contradicted', 'unknown', 'conflict'];
const REPLICAS = [1, 2];
const ANSWER = 'Return exactly one line: RESULT: entailed, RESULT: contradicted, RESULT: unknown, or RESULT: conflict.';

const stable = value => JSON.stringify(value, null, 2) + '\n';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const cap = value => value[0].toUpperCase() + value.slice(1);

function choice(key, values) {
  return values[parseInt(sha256(`${SEED}:${key}`).slice(0, 8), 16) % values.length];
}

function predicates(depth) {
  const names = ['positive_seed', 'negative_seed', 'approved'];
  for (const polarity of ['positive', 'negative']) {
    for (let n = 1; n <= depth; n += 1) names.push(`${polarity}_stage_${n}`);
    for (let n = 1; n <= depth; n += 1) names.push(`${polarity}_gate_${n}`);
  }
  names.push('noise_a', 'noise_b', 'noise_c');
  return [...new Set(names)].map(name => ({ name, arity: 1 }));
}

function clause(id, program, natural_language) {
  return Object.freeze({ id, source: `source_${id}`, source_group: `group_${id}`, program, natural_language });
}

function branch({ polarity, depth, topology, subject, decoy, enabled, startIndex }) {
  const items = [];
  const seed = `${polarity}_seed`;
  items.push(clause(`i${startIndex}`, `${seed}(${enabled ? subject : decoy}).`, `${cap(enabled ? subject : decoy)} has the ${polarity} seed.`));
  let index = startIndex + 1;
  for (let n = 1; n <= depth; n += 1) {
    const previous = n === 1 ? seed : `${polarity}_stage_${n - 1}`;
    const current = `${polarity}_stage_${n}`;
    const gate = `${polarity}_gate_${n}`;
    if (topology === 'join') {
      // Unknown cases preserve every rule but split one required gate onto a
      // decoy entity. This prevents bag-of-facts matching from earning credit.
      const gateOwner = enabled || n < depth ? subject : decoy;
      items.push(clause(`i${index++}`, `${gate}(${gateOwner}).`, `${cap(gateOwner)} has ${polarity} gate ${n}.`));
      items.push(clause(`i${index++}`, `${current}(X) :- ${previous}(X), ${gate}(X).`, `If the same entity has ${previous.replaceAll('_', ' ')} and ${polarity} gate ${n}, it reaches ${polarity} stage ${n}.`));
    } else {
      items.push(clause(`i${index++}`, `${current}(X) :- ${previous}(X).`, `If an entity has ${previous.replaceAll('_', ' ')}, it reaches ${polarity} stage ${n}.`));
    }
  }
  const last = `${polarity}_stage_${depth}`;
  const head = polarity === 'positive' ? 'approved(X)' : 'neg(approved(X))';
  const conclusion = polarity === 'positive' ? 'it is approved' : 'its approval is denied';
  items.push(clause(`i${index++}`, `${head} :- ${last}(X).`, `If an entity reaches ${polarity} stage ${depth}, ${conclusion}.`));
  return { items, nextIndex: index };
}

function sourceCase({ depth, topology, status, replica }) {
  const caseId = `rs-d${depth}-${topology}-${status}-r${replica}`;
  const subject = choice(`${caseId}:subject`, ['atlas', 'cedar', 'iris', 'lyra', 'nova', 'orion']);
  const decoy = choice(`${caseId}:decoy`, ['amber', 'cobalt', 'ember', 'fable', 'garnet', 'helix']);
  const positiveEnabled = status === 'entailed' || status === 'conflict';
  const negativeEnabled = status === 'contradicted' || status === 'conflict';
  const positive = branch({ polarity: 'positive', depth, topology, subject, decoy, enabled: positiveEnabled, startIndex: 1 });
  const negative = branch({ polarity: 'negative', depth, topology, subject, decoy, enabled: negativeEnabled, startIndex: positive.nextIndex });
  const items = [...positive.items, ...negative.items];
  let index = negative.nextIndex;
  for (const [predicate, owner] of [['noise_a', decoy], ['noise_b', subject], ['noise_c', decoy]]) {
    items.push(clause(`i${index++}`, `${predicate}(${owner}).`, `${cap(owner)} has unrelated marker ${predicate.slice(-1)}.`));
  }
  return Object.freeze({
    case_id: caseId,
    stratum: Object.freeze({ depth, topology, status, replica }),
    subject,
    query: `approved(${subject})`,
    ideas: Object.freeze({ version: 'reasoning-stress-domain-v1', predicates: Object.freeze(predicates(depth)) }),
    items: Object.freeze(items),
  });
}

function renderNatural(item) {
  return item.items.map(value => value.natural_language).join('\n');
}

function renderFormal(item) {
  return item.items.map(value => value.program).join('\n');
}

function question(item) {
  return `Question: Is ${cap(item.subject)} approved?`;
}

function prompt(representation, item) {
  return `You are given one finite signed rule world. Use open-world reasoning: absence is not negation. A result is conflict only when both the query and its explicit negation are derivable.\n${representation}\n${question(item)}\n${ANSWER}\n`;
}

function publicReceipt(result, item) {
  const opposite = `neg(${item.query})`;
  const supportFor = literal => result.raw_support_sets
    .filter(value => value.literal === literal)
    .map(value => value.item_ids);
  const body = {
    version: 'signed-horn-checker-receipt-v1',
    query: item.query,
    raw_status: result.raw_status,
    safe_status: result.safe_status,
    query_support_item_ids: supportFor(item.query),
    opposite_support_item_ids: supportFor(opposite),
    checker_evidence_sha256: sha256(stable({
      conflicts: result.conflicts,
      raw_support_sets: result.raw_support_sets,
      safe_support_sets: result.safe_support_sets,
      evidence: result.evidence,
    })),
  };
  return Object.freeze({ receipt_id: sha256(stable(body)), ...body });
}

async function buildCase(spec) {
  const item = sourceCase(spec);
  const result = await check({ snapshot: { ideas: item.ideas, items: item.items }, query: item.query });
  if (result.status !== 'ok') throw new Error(`${item.case_id}: checker ${result.status}: ${result.reason || ''}`);
  if (result.raw_status !== spec.status) throw new Error(`${item.case_id}: expected ${spec.status}, got ${result.raw_status}`);
  const natural = renderNatural(item), formal = renderFormal(item), receipt = publicReceipt(result, item);
  const prompts = {
    p0: prompt(natural, item),
    p1: prompt(formal, item),
    p2: `${prompt(formal, item)}Checker receipt (trusted host output; copy its raw_status into RESULT):\n${JSON.stringify(receipt)}\n`,
  };
  for (const value of Object.values(prompts)) {
    if (value.includes(item.case_id) || /\b(?:oracle|expected_status|gold_label)\b/i.test(value)) throw new Error(`${item.case_id}: leaked evaluator metadata`);
  }
  return Object.freeze({
    case_id: item.case_id,
    stratum: item.stratum,
    formal_world: Object.freeze({ ideas: item.ideas, items: item.items, query: item.query }),
    renderings: Object.freeze({ natural, formal }),
    prompts: Object.freeze(prompts),
    checker_receipt: receipt,
    oracle: Object.freeze({ status: result.raw_status }),
  });
}

async function generateFixture() {
  const cases = [];
  for (const depth of DEPTHS) for (const topology of TOPOLOGIES) for (const status of STATUSES) for (const replica of REPLICAS) {
    cases.push(await buildCase({ depth, topology, status, replica }));
  }
  return Object.freeze({ schema_version: VERSION, seed: SEED, cases: Object.freeze(cases) });
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { encoding: 'utf8', flag: 'wx' });
  return Object.freeze({ file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) });
}

module.exports = { ANSWER, DEPTHS, REPLICAS, SEED, STATUSES, TOPOLOGIES, VERSION, buildCase, generateFixture, prompt, renderFormal, renderNatural, sha256, sourceCase, stable, writeFixture };

if (require.main === module) {
  (async () => {
    const output = process.argv[2];
    if (!output || process.argv.length !== 3) throw new Error('usage: node world/reasoning-stress/generator.cjs OUTPUT.json');
    const fixture = await generateFixture();
    console.log(JSON.stringify({ status: 'ok', cases: fixture.cases.length, ...writeFixture(output, fixture) }));
  })().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
