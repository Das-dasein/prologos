"use strict";

const POLICY_VERSION = "independent-fact-support-v1";
const ATTESTED_POLICY_VERSION = "independent-host-attested-fact-support-v2";
const LINEAGE_POLICY_VERSION = "independent-host-attested-lineage-support-v3";
const POLICY_KEYS = new Set(["id", "minIndependentFactSupportPaths", "requireHostAttestedSourceGroups", "requireDistinctSourceLineages"]);

function normalizeActionPolicy(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("action policy must be an object");
  if (Object.keys(value).some(key => !POLICY_KEYS.has(key))) throw new Error("unsupported action policy field");
  const minimum = value.minIndependentFactSupportPaths;
  if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 8) throw new Error("independent fact support threshold must be an integer from 1 to 8");
  if (value.requireHostAttestedSourceGroups !== undefined && typeof value.requireHostAttestedSourceGroups !== "boolean") throw new Error("host-attested source group requirement must be boolean");
  if (value.requireDistinctSourceLineages !== undefined && typeof value.requireDistinctSourceLineages !== "boolean") throw new Error("source lineage requirement must be boolean");
  const requireDistinctSourceLineages = value.requireDistinctSourceLineages === true;
  if (requireDistinctSourceLineages && value.requireHostAttestedSourceGroups === false) throw new Error("source lineage policy requires host-attested groups");
  const requireHostAttestedSourceGroups = value.requireHostAttestedSourceGroups === true || requireDistinctSourceLineages;
  const id = requireDistinctSourceLineages ? LINEAGE_POLICY_VERSION : requireHostAttestedSourceGroups ? ATTESTED_POLICY_VERSION : POLICY_VERSION;
  if (value.id !== undefined && value.id !== id) throw new Error("unsupported action policy identity");
  return { id, minIndependentFactSupportPaths: minimum, ...(requireHostAttestedSourceGroups ? { requireHostAttestedSourceGroups: true } : {}), ...(requireDistinctSourceLineages ? { requireDistinctSourceLineages: true } : {}) };
}

function canonicalSupportPaths(result, literal = result.query) {
  if (!result || !Array.isArray(result.safe_support_sets)) return [];
  return result.safe_support_sets
    .filter(value => value.literal === literal)
    .map(value => ({
      item_ids: [...new Set(Array.isArray(value.item_ids) ? value.item_ids : [])].sort(),
      fact_source_group_ids: [...new Set(Array.isArray(value.fact_source_group_ids) ? value.fact_source_group_ids : [])].sort(),
      rule_source_group_ids: [...new Set(Array.isArray(value.rule_source_group_ids) ? value.rule_source_group_ids : [])].sort(),
      fact_source_group_assurances: Array.isArray(value.fact_source_group_assurances) ? value.fact_source_group_assurances.map(record => ({ source_group_id: record.source_group_id, assurances: [...new Set(record.assurances || [])].sort(), lineage_ids: [...new Set(record.lineage_ids || [])].sort() })).sort((a, b) => a.source_group_id.localeCompare(b.source_group_id)) : [],
    }))
    .map(value => ({ ...value, fact_source_lineage_ids: [...new Set(value.fact_source_group_assurances.flatMap(record => record.lineage_ids))].sort() }))
    .filter(value => value.fact_source_group_ids.length > 0)
    .sort((left, right) => {
      const groups = left.fact_source_group_ids.join(",").localeCompare(right.fact_source_group_ids.join(","));
      return groups || left.item_ids.join(",").localeCompare(right.item_ids.join(","));
    });
}

function firstDisjointSelection(paths, minimum, key = "fact_source_group_ids") {
  const chosen = [];
  const used = new Set();
  function search(start) {
    if (chosen.length === minimum) return chosen.map(index => paths[index]);
    for (let index = start; index < paths.length; index += 1) {
      const groups = paths[index][key];
      if (groups.some(group => used.has(group))) continue;
      chosen.push(index); groups.forEach(group => used.add(group));
      const found = search(index + 1);
      if (found) return found;
      chosen.pop(); groups.forEach(group => used.delete(group));
    }
    return null;
  }
  return search(0);
}

function evaluateActionProvenance(result, literal = result.query, policy) {
  const normalized = normalizeActionPolicy(policy);
  if (!normalized) return null;
  const observedPaths = canonicalSupportPaths(result, literal);
  const assuredPaths = normalized.requireHostAttestedSourceGroups
    ? observedPaths.filter(path => path.fact_source_group_ids.every(group => {
      const record = path.fact_source_group_assurances.find(value => value.source_group_id === group);
      return record && record.assurances.length === 1 && record.assurances[0] === "host_attested";
    }))
    : observedPaths;
  const paths = normalized.requireDistinctSourceLineages
    ? assuredPaths.filter(path => path.fact_source_group_ids.every(group => {
      const record = path.fact_source_group_assurances.find(value => value.source_group_id === group);
      return record && record.lineage_ids.length === 1;
    }))
    : assuredPaths;
  const selected = result?.status === "ok" && result.safe_status === "entailed"
    ? firstDisjointSelection(paths, normalized.minIndependentFactSupportPaths, normalized.requireDistinctSourceLineages ? "fact_source_lineage_ids" : "fact_source_group_ids")
    : null;
  return {
    policy: normalized,
    query: literal,
    satisfied: selected !== null,
    observed_support_path_count: observedPaths.length,
    eligible_support_path_count: paths.length,
    rejected_unattested_support_path_count: observedPaths.length - assuredPaths.length,
    rejected_unlineaged_support_path_count: assuredPaths.length - paths.length,
    selected_support_paths: selected ?? [],
    epistemic_meaning: "deterministic provenance threshold only; source independence and truth are not inferred",
  };
}

module.exports = { ATTESTED_POLICY_VERSION, LINEAGE_POLICY_VERSION, POLICY_VERSION, canonicalSupportPaths, evaluateActionProvenance, firstDisjointSelection, normalizeActionPolicy };
