"use strict";

function opposite(literal) { return literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`; }

function activeItems(items) {
  const replaced = new Set(items.map(item => item.replaces).filter(Boolean));
  const active = new Set(items.filter(item => !replaced.has(item.id)).map(item => item.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) if (active.has(item.id) && (item.dependsOn ?? []).some(id => !active.has(id))) { active.delete(item.id); changed = true; }
  }
  return items.filter(item => active.has(item.id));
}

function evaluate(items, query) {
  const active = activeItems(items), positive = active.some(item => item.literal === query), negative = active.some(item => item.literal === opposite(query));
  return { status: positive && negative ? "conflict" : positive ? "entailed" : negative ? "contradicted" : "unknown", active_item_ids: active.map(item => item.id) };
}

function decide(items, query, kind) {
  const result = evaluate(items, query);
  if (result.status === "conflict") return { action: "flag_conflict", result };
  if (result.status === "entailed") return { action: "report_current_assessment", result };
  if (kind === "withdrawal" && result.status === "unknown") return { action: "request_source", result };
  return { action: "invalid", result };
}

module.exports = { activeItems, decide, evaluate, opposite };
