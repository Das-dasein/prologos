"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CONNECTOR_ID = "connector/datacite-related-identifiers-v1";
const ANCESTOR_RELATIONS = new Set(["IsDerivedFrom", "IsNewVersionOf", "IsTranslationOf", "IsVariantFormOf", "IsVersionOf"]);
const IDENTITY_RELATIONS = new Set(["IsIdenticalTo"]);
const MAX_RECORD_BYTES = 2 * 1024 * 1024;
const MAX_LINEAGE_DEPTH = 16;

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }

function normalizeDoi(value) {
  if (typeof value !== "string") throw new Error("DataCite DOI must be a string");
  let doi = value.trim().toLowerCase();
  doi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
  try { doi = decodeURIComponent(doi); } catch { throw new Error("DataCite DOI has invalid encoding"); }
  if (!/^10\.\d{4,9}\/[\x21-\x7e]+$/.test(doi) || doi.length > 240) throw new Error("DataCite DOI is invalid");
  return doi;
}

function rawBuffer(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (buffer.length < 2 || buffer.length > MAX_RECORD_BYTES) throw new Error("DataCite record has invalid size");
  return buffer;
}

function parseRecord(raw) {
  const bytes = rawBuffer(raw);
  let document;
  try { document = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("DataCite record is not valid JSON"); }
  const data = document?.data;
  if (!data || data.type !== "dois" || !data.attributes || Array.isArray(data.attributes)) throw new Error("DataCite singleton record is invalid");
  const doi = normalizeDoi(data.id);
  if (normalizeDoi(data.attributes.doi) !== doi) throw new Error("DataCite record identifier mismatch");
  const related = data.attributes.relatedIdentifiers ?? [];
  if (!Array.isArray(related)) throw new Error("DataCite relatedIdentifiers must be an array");
  const relatedDois = (relations, label) => [...new Set(related.filter(entry => entry && relations.has(entry.relationType)).map(entry => {
    if (entry.relatedIdentifierType !== "DOI") throw new Error(`DataCite ${label} relation must use a DOI identifier`);
    return normalizeDoi(entry.relatedIdentifier);
  }))].sort();
  const parents = relatedDois(ANCESTOR_RELATIONS, "ancestor");
  const identities = relatedDois(IDENTITY_RELATIONS, "identity");
  if (parents.length > 1) throw new Error(`DataCite lineage for ${doi} has multiple direct ancestors`);
  if (new Set([doi, ...parents, ...identities]).size > MAX_LINEAGE_DEPTH + 1) throw new Error(`DataCite lineage for ${doi} exceeds ${MAX_LINEAGE_DEPTH + 1} related records`);
  if (identities.length > MAX_LINEAGE_DEPTH) throw new Error(`DataCite identity set for ${doi} exceeds ${MAX_LINEAGE_DEPTH} links`);
  const titles = data.attributes.titles;
  const title = Array.isArray(titles) && typeof titles[0]?.title === "string" && titles[0].title.trim() ? titles[0].title.trim() : null;
  return { doi, title, parent: parents[0] ?? null, identities, raw: bytes, receipt_sha256: sha256(bytes) };
}

function resolveRoot(doi, records, visiting = new Set(), depth = 0) {
  if (depth > MAX_LINEAGE_DEPTH) throw new Error(`DataCite lineage for ${doi} exceeds depth ${MAX_LINEAGE_DEPTH}`);
  if (visiting.has(doi)) throw new Error(`DataCite lineage cycle includes ${doi}`);
  const record = records.get(doi);
  if (!record || !record.parent) return doi;
  const next = new Set(visiting); next.add(doi);
  return resolveRoot(record.parent, records, next, depth + 1);
}

function prepareBundle(rawRecords) {
  if (!Array.isArray(rawRecords) || rawRecords.length < 1 || rawRecords.length > MAX_LINEAGE_DEPTH + 1) throw new Error("DataCite bundle needs 1..17 records");
  const records = new Map();
  for (const raw of rawRecords) {
    const record = parseRecord(raw);
    if (records.has(record.doi)) throw new Error(`duplicate DataCite DOI ${record.doi}`);
    records.set(record.doi, record);
  }
  const disjoint = new Map();
  const ensure = doi => { if (!disjoint.has(doi)) disjoint.set(doi, doi); };
  const find = doi => {
    ensure(doi);
    let root = doi;
    while (disjoint.get(root) !== root) root = disjoint.get(root);
    let current = doi;
    while (disjoint.get(current) !== current) {
      const next = disjoint.get(current); disjoint.set(current, root); current = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left), b = find(right);
    if (a !== b) disjoint.set(b, a);
  };
  for (const record of records.values()) {
    ensure(record.doi);
    for (const identity of record.identities) union(record.doi, identity);
    if (record.parent) ensure(record.parent);
  }
  if (disjoint.size > MAX_LINEAGE_DEPTH + 1) throw new Error(`DataCite lineage graph exceeds ${MAX_LINEAGE_DEPTH + 1} identifiers`);
  const members = new Map();
  for (const doi of disjoint.keys()) {
    const key = find(doi);
    if (!members.has(key)) members.set(key, []);
    members.get(key).push(doi);
  }
  const canonical = new Map();
  for (const values of members.values()) {
    values.sort();
    for (const doi of values) canonical.set(doi, values[0]);
  }
  const ancestors = new Map();
  for (const record of records.values()) if (record.parent) {
    const child = canonical.get(record.doi), parent = canonical.get(record.parent);
    if (child === parent) continue;
    if (!ancestors.has(child)) ancestors.set(child, new Set());
    ancestors.get(child).add(parent);
  }
  for (const [component, values] of ancestors) if (values.size > 1) {
    throw new Error(`DataCite lineage for ${component} has multiple direct ancestors after identity collapse`);
  }
  const roots = new Map();
  const componentRoot = (component, visiting = new Set(), depth = 0) => {
    if (depth > MAX_LINEAGE_DEPTH) throw new Error(`DataCite lineage for ${component} exceeds depth ${MAX_LINEAGE_DEPTH}`);
    if (visiting.has(component)) throw new Error(`DataCite lineage cycle includes ${component}`);
    if (roots.has(component)) return roots.get(component);
    const next = ancestors.get(component)?.values().next().value;
    if (!next) { roots.set(component, component); return component; }
    const path = new Set(visiting); path.add(component);
    const root = componentRoot(next, path, depth + 1); roots.set(component, root); return root;
  };
  const identityInPath = (component, visiting = new Set()) => {
    if (visiting.has(component)) return false;
    const originalRoot = find(component);
    if ((members.get(originalRoot)?.length ?? 0) > 1) return true;
    const next = ancestors.get(component)?.values().next().value;
    if (!next) return false;
    const path = new Set(visiting); path.add(component);
    return identityInPath(next, path);
  };
  return [...records.values()].sort((a, b) => a.doi.localeCompare(b.doi)).map(record => {
    const component = canonical.get(record.doi), root = componentRoot(component);
    const relationKinds = identityInPath(component) ? "identity/derivation/version" : "derivation/version";
    return {
      doi: record.doi,
      title: record.title,
      source_group: `datacite:doi:${record.doi}`,
      source_group_attestation: {
        by: CONNECTOR_ID,
        reason: `DataCite DOI metadata records explicit ${relationKinds} lineage rooted at ${root}`,
        lineage_id: `datacite:doi:${root}`,
        external_receipt_sha256: record.receipt_sha256,
      },
    };
  });
}

function storeRawReceipts(rawRecords, directory) {
  const target = path.resolve(directory);
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  return rawRecords.map(raw => {
    const bytes = rawBuffer(raw), digest = sha256(bytes), file = path.join(target, `${digest}.json`);
    if (fs.existsSync(file) && !fs.readFileSync(file).equals(bytes)) throw new Error("DataCite receipt hash collision");
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, { mode: 0o600, flag: "wx" });
    return file;
  });
}

async function readResponseBytes(response) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RECORD_BYTES) throw new Error("DataCite response exceeds size limit");
  if (response.body?.getReader) {
    const reader = response.body.getReader(), chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value); total += chunk.length;
      if (total > MAX_RECORD_BYTES) { await reader.cancel(); throw new Error("DataCite response exceeds size limit"); }
      chunks.push(chunk);
    }
    return rawBuffer(Buffer.concat(chunks, total));
  }
  return rawBuffer(Buffer.from(await response.arrayBuffer()));
}

async function fetchBundle(startDoi, { fetchImpl = globalThis.fetch, userAgent = "prolog-agent-memory/0.1", timeoutMs = 10000 } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation required");
  if (typeof userAgent !== "string" || !userAgent.trim() || userAgent.length > 512) throw new Error("bounded DataCite user agent required");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error("DataCite timeout must be 1..60000 ms");
  const raws = [], seen = new Set(), pending = [normalizeDoi(startDoi)];
  while (pending.length) {
    const doi = pending.shift();
    if (seen.has(doi)) continue;
    if (seen.size >= MAX_LINEAGE_DEPTH + 1) throw new Error(`DataCite lineage exceeds ${MAX_LINEAGE_DEPTH + 1} records`);
    seen.add(doi);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response, bytes;
    try {
      response = await fetchImpl(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, { headers: { accept: "application/vnd.api+json", "user-agent": userAgent }, signal: controller.signal });
      if (!response?.ok) throw new Error(`DataCite request for ${doi} failed with HTTP ${response?.status ?? "unknown"}`);
      bytes = await readResponseBytes(response);
    } finally { clearTimeout(timer); }
    const record = parseRecord(bytes);
    if (record.doi !== doi) throw new Error("DataCite response does not match requested DOI");
    raws.push(bytes);
    for (const linked of [record.parent, ...record.identities].filter(Boolean).sort()) if (!seen.has(linked) && !pending.includes(linked)) {
      if (seen.size + pending.length >= MAX_LINEAGE_DEPTH + 1) throw new Error(`DataCite lineage exceeds ${MAX_LINEAGE_DEPTH + 1} records`);
      pending.push(linked);
    }
  }
  return raws;
}

module.exports = { ANCESTOR_RELATIONS, CONNECTOR_ID, IDENTITY_RELATIONS, fetchBundle, normalizeDoi, parseRecord, prepareBundle, readResponseBytes, resolveRoot, sha256, storeRawReceipts };
