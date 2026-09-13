"use strict";

// This module is an analytical projection over a checker receipt.  It has no
// authority to admit memory or choose an action.  A support set means only that
// the listed program items derive a literal in the selected closure.
function opposite(literal) {
  return literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`;
}
function idsKey(ids) { return [...ids].sort().join("\u0000"); }
function subset(left, right) { return left.every(id => right.includes(id)); }
function supportRecords(receipt, scope) {
  if (!receipt || !["raw", "safe"].includes(scope)) throw new Error("argument scope must be raw or safe");
  const records = receipt[`${scope}_support_sets`];
  if (!Array.isArray(records)) throw new Error(`checker receipt has no ${scope}_support_sets`);
  const seen = new Set();
  return records.map(record => {
    const sourceFields = [
      "source_ids", "fact_source_ids", "rule_source_ids",
      "source_group_ids", "fact_source_group_ids", "rule_source_group_ids"
    ];
    if (!record || typeof record.literal !== "string" || !Array.isArray(record.item_ids) || !record.item_ids.every(id => typeof id === "string" && id) || sourceFields.some(field => record[field] !== undefined && (!Array.isArray(record[field]) || !record[field].every(id => typeof id === "string" && id)))) {
      throw new Error("invalid support-set receipt");
    }
    const item_ids = [...new Set(record.item_ids)].sort();
    const key = `${record.literal}\u0001${idsKey(item_ids)}`;
    if (seen.has(key)) throw new Error("duplicate support-set receipt");
    seen.add(key);
    return {
      literal: record.literal,
      item_ids,
      source_ids: [...new Set(record.source_ids || [])].sort(),
      fact_source_ids: [...new Set(record.fact_source_ids || [])].sort(),
      rule_source_ids: [...new Set(record.rule_source_ids || [])].sort(),
      source_group_ids: [...new Set(record.source_group_ids || [])].sort(),
      fact_source_group_ids: [...new Set(record.fact_source_group_ids || [])].sort(),
      rule_source_group_ids: [...new Set(record.rule_source_group_ids || [])].sort(),
    };
  }).sort((a, b) => a.literal.localeCompare(b.literal) || idsKey(a.item_ids).localeCompare(idsKey(b.item_ids)));
}

function buildArgumentGraph(receipt, { scope = "raw", maxArguments = 32 } = {}) {
  if (!Number.isSafeInteger(maxArguments) || maxArguments < 1) throw new Error("maxArguments must be a positive integer");
  const supports = supportRecords(receipt, scope);
  if (supports.length > maxArguments) throw new Error("argument_limit");
  const arguments_ = supports.map((support, index) => ({
    id: `arg_${scope}_${index + 1}`,
    conclusion: support.literal,
    item_ids: support.item_ids,
    source_ids: support.source_ids,
    fact_source_ids: support.fact_source_ids,
    rule_source_ids: support.rule_source_ids,
    source_group_ids: support.source_group_ids,
    fact_source_group_ids: support.fact_source_group_ids,
    rule_source_group_ids: support.rule_source_group_ids,
    // An item is a possible premise only when its own minimal support is
    // contained in this argument. This preserves a concrete provenance link.
    support_literals: supports.filter(candidate => subset(candidate.item_ids, support.item_ids)).map(candidate => candidate.literal)
  }));
  const attacks = [];
  for (const attacker of arguments_) for (const target of arguments_) {
    if (attacker.id === target.id) continue;
    for (const premise of target.support_literals) if (attacker.conclusion === opposite(premise)) {
      attacks.push({
        from: attacker.id,
        to: target.id,
        kind: premise === target.conclusion ? "rebut" : "undercut",
        against: premise
      });
    }
  }
  return { semantics: "support-attack-v0", scope, arguments: arguments_, attacks };
}

function normalizeGraph(graph, maxArguments) {
  if (!graph || !Array.isArray(graph.arguments) || !Array.isArray(graph.attacks)) throw new Error("invalid argument graph");
  if (graph.arguments.length > maxArguments) throw new Error("argument_limit");
  const ids = new Set(graph.arguments.map(a => a.id));
  if (ids.size !== graph.arguments.length || graph.arguments.some(a => typeof a.id !== "string" || !a.id || typeof a.conclusion !== "string" || !a.conclusion)) throw new Error("invalid argument identity");
  const seen = new Set(), attacks = [];
  for (const edge of graph.attacks) {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to)) throw new Error("invalid attack edge");
    const key = `${edge.from}\u0000${edge.to}`;
    if (!seen.has(key)) { seen.add(key); attacks.push({ from: edge.from, to: edge.to }); }
  }
  return { arguments: [...graph.arguments].sort((a, b) => a.id.localeCompare(b.id)), attacks };
}

function analyzeDung(graph, { maxArguments = 16 } = {}) {
  if (!Number.isSafeInteger(maxArguments) || maxArguments < 1) throw new Error("maxArguments must be a positive integer");
  const normalized = normalizeGraph(graph, maxArguments), ids = normalized.arguments.map(a => a.id);
  const attackers = new Map(ids.map(id => [id, new Set()]));
  const attacks = new Map(ids.map(id => [id, new Set()]));
  for (const edge of normalized.attacks) { attackers.get(edge.to).add(edge.from); attacks.get(edge.from).add(edge.to); }
  const defends = (set, argument) => [...attackers.get(argument)].every(attacker => [...set].some(defender => attacks.get(defender).has(attacker)));
  let grounded = new Set();
  while (true) {
    const next = new Set(ids.filter(argument => defends(grounded, argument)));
    if (next.size === grounded.size && [...next].every(x => grounded.has(x))) break;
    grounded = next;
  }
  const admissible = [];
  const total = 2 ** ids.length;
  for (let mask = 0; mask < total; mask++) {
    const extension = new Set(ids.filter((_, index) => (mask & (2 ** index)) !== 0));
    const conflictFree = [...extension].every(from => [...extension].every(to => !attacks.get(from).has(to)));
    if (conflictFree && [...extension].every(argument => defends(extension, argument))) admissible.push(extension);
  }
  const preferred = admissible.filter(extension => !admissible.some(other => extension.size < other.size && [...extension].every(id => other.has(id))));
  const sorted = extension => [...extension].sort();
  return {
    semantics: "dung-v0",
    grounded: sorted(grounded),
    preferred: preferred.map(sorted).sort((a, b) => a.join("\u0000").localeCompare(b.join("\u0000"))),
    admissible_count: admissible.length
  };
}

module.exports = { opposite, buildArgumentGraph, analyzeDung };
