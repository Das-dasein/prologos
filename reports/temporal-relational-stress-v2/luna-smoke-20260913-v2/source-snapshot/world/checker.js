"use strict";
const { spawn } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");

function stable(x) {
  if (Array.isArray(x)) return `[${x.map(stable).join(",")}]`;
  if (x && typeof x === "object") return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${stable(x[k])}`).join(",")}}`;
  return JSON.stringify(x);
}
const hash = x => crypto.createHash("sha256").update(stable(x)).digest("hex");
const clone = x => JSON.parse(JSON.stringify(x));
function program(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 32768) throw new Error("nonempty bounded Prolog source required");
  return text.trim().endsWith(".") ? text.trim() : `${text.trim()}.`;
}
function provenanceId(value, name) {
  if (typeof value !== "string" || !value.trim() || value.length > 256) throw new Error(`${name} must be a bounded nonempty string`);
  return value;
}
const SOURCE_GROUP_ASSURANCES = new Set(["host_attested", "host_declared", "event_local", "legacy_unspecified"]);
function provenanceAssurance(value) {
  if (!SOURCE_GROUP_ASSURANCES.has(value)) throw new Error("checker item source group assurance is invalid");
  return value;
}
  function provenanceAttestation(value, assurance) {
  if (value === undefined || value === null) {
    if (assurance === "host_attested") throw new Error("host-attested checker item requires an attestation receipt");
    return null;
  }
  if (assurance !== "host_attested" || typeof value !== "object" || Array.isArray(value)) throw new Error("checker item source group attestation is inconsistent");
  if (Object.keys(value).some(key => !["schema_version", "by", "reason", "lineage_id", "external_receipt_sha256"].includes(key))) throw new Error("checker item source group attestation has unsupported fields");
  if (!["source-group-attestation-v1", "source-group-attestation-v2"].includes(value.schema_version) || typeof value.by !== "string" || !value.by.trim() || typeof value.reason !== "string" || !value.reason.trim()) throw new Error("checker item source group attestation is invalid");
  if (value.by.length > 256 || value.reason.length > 32768) throw new Error("checker item source group attestation is too large");
  if (value.schema_version === "source-group-attestation-v2" && (typeof value.lineage_id !== "string" || !value.lineage_id.trim() || value.lineage_id.length > 256)) throw new Error("checker item source lineage is invalid");
  if (value.schema_version === "source-group-attestation-v1" && value.lineage_id !== undefined) throw new Error("v1 source group attestation cannot carry lineage");
  if (value.external_receipt_sha256 !== undefined && !/^[a-f0-9]{64}$/.test(value.external_receipt_sha256)) throw new Error("checker item external source receipt hash is invalid");
  return value;
}
function enrichSupportAssurance(result, items) {
  if (!items.some(item => item.source_group_assurance !== undefined) || result.status !== "ok") return result;
  const byId = new Map(items.map(item => [item.id, item]));
  const enrich = support => {
    const factSources = new Set(support.fact_source_ids || []), grouped = new Map();
    for (const id of support.item_ids || []) {
      const item = byId.get(id);
      if (!item || !factSources.has(item.source)) continue;
      if (!grouped.has(item.source_group)) grouped.set(item.source_group, { assurances: new Set(), lineage_ids: new Set() });
      const record = grouped.get(item.source_group);
      record.assurances.add(item.source_group_assurance ?? "legacy_unspecified");
      if (item.source_group_attestation?.lineage_id) record.lineage_ids.add(item.source_group_attestation.lineage_id);
    }
    return { ...support, fact_source_group_assurances: [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([source_group_id, record]) => ({ source_group_id, assurances: [...record.assurances].sort(), lineage_ids: [...record.lineage_ids].sort() })) };
  };
  return { ...result, raw_support_sets: result.raw_support_sets.map(enrich), safe_support_sets: result.safe_support_sets.map(enrich) };
}
const RESERVED = new Set(["neg", "call", "consult", "assert", "asserta", "assertz", "retract", "retractall", "initialization", "halt", "true", "fail", "open", "shell", "read", "write"]);
function registry(value) {
  if (!value || typeof value.version !== "string" || !Array.isArray(value.predicates) || !value.predicates.length) throw new Error("explicit versioned domain projection required");
  const seen = new Set();
  for (const p of value.predicates) {
    if (!/^[a-z][a-z0-9_]*$/.test(p.name) || RESERVED.has(p.name) || !Number.isInteger(p.arity) || p.arity < 0 || p.arity > 4) throw new Error("unsupported predicate declaration");
    const sig = `${p.name}/${p.arity}`;
    if (seen.has(sig)) throw new Error("duplicate predicate signature");
    seen.add(sig);
  }
  return value.predicates.map(({ name, arity }) => ({ name, arity }));
}
function check({ snapshot, query, assumptions = [], mode = "query", importText = "", timeoutMs = 2000, inferences = 1000000, maxFacts = 2048, maxProofSupportSets = 16384, maxOutputBytes = 2 * 1024 * 1024 }) {
  for (const v of [timeoutMs, inferences, maxFacts, maxProofSupportSets, maxOutputBytes]) if (!Number.isSafeInteger(v) || v < 1) throw new Error("positive integer resource limits required");
  if (!["query", "validate", "import_assertions"].includes(mode)) throw new Error("invalid checker mode");
  const predicates = registry(snapshot.ideas);
  if (!Array.isArray(assumptions) || assumptions.length > 8 || snapshot.items.length > 512) throw new Error("checker input limit");
  const items = [...snapshot.items, ...assumptions].map(x => {
    const assurance = x.source_group_assurance === undefined ? undefined : provenanceAssurance(x.source_group_assurance);
    const attestation = provenanceAttestation(x.source_group_attestation, assurance);
    return {
      id: x.id,
      source: provenanceId(x.source, "checker item source"),
      source_group: provenanceId(x.source_group ?? x.source, "checker item source group"),
      ...(assurance === undefined ? {} : { source_group_assurance: assurance }),
      ...(attestation === null ? {} : { source_group_attestation: attestation }),
      program: program(x.program)
    };
  });
  if (new Set(items.map(x => x.id)).size !== items.length) throw new Error("duplicate checker item identity");
  const runtimeItems = items.map(({ source_group_assurance, source_group_attestation, ...item }) => item);
  const request = { mode, registry: predicates, items: runtimeItems, query: program(query), import_text: importText, seconds: timeoutMs / 1000, inferences, max_facts: maxFacts, max_proof_support_sets: maxProofSupportSets };
  if (Buffer.byteLength(JSON.stringify(request)) > 1024 * 1024) throw new Error("checker input too large");
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.SWIPL_BIN || "swipl", ["-q", "--stack_limit=64m", "-s", path.join(__dirname, "checker.pl")], { stdio: ["pipe", "pipe", "pipe"] });
    const output = [], errors = []; let bytes = 0, exhausted = null;
    const timer = setTimeout(() => { exhausted = "wall_time"; child.kill("SIGKILL"); }, timeoutMs + 200);
    for (const [stream, target] of [[child.stdout, output], [child.stderr, errors]]) stream.on("data", b => {
      bytes += b.length;
      if (bytes > maxOutputBytes) { exhausted = "output"; child.kill("SIGKILL"); } else target.push(b);
    });
    child.on("error", e => { clearTimeout(timer); reject(e); });
    child.stdin.on("error", () => {});
    child.on("close", code => {
      clearTimeout(timer);
      const evidence = { runtime: "swi-signed-horn-v0", interpreter_sha256: hash(fs.readFileSync(path.join(__dirname, "checker.pl"), "utf8")), input_sha256: hash(request), timeoutMs, inferences, maxFacts, maxProofSupportSets, maxOutputBytes };
      if (exhausted) return resolve({ status: "resource_exhausted", reason: exhausted, evidence });
      if (code !== 0) return resolve({ status: "execution_error", reason: Buffer.concat(errors).toString(), evidence });
      try { resolve(enrichSupportAssurance({ ...JSON.parse(Buffer.concat(output).toString()), evidence }, items)); }
      catch { resolve({ status: "execution_error", reason: "invalid checker protocol", evidence }); }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
module.exports = { check, hash, stable, clone, program, registry };
