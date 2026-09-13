"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CONNECTOR_ID = "connector/datacite-related-identifiers-v1";
const ANCESTOR_RELATIONS = new Set(["IsDerivedFrom", "IsNewVersionOf", "IsTranslationOf", "IsVariantFormOf", "IsVersionOf"]);
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
  const parents = [...new Set(related.filter(entry => entry && ANCESTOR_RELATIONS.has(entry.relationType)).map(entry => {
    if (entry.relatedIdentifierType !== "DOI") throw new Error("DataCite ancestor relation must use a DOI identifier");
    return normalizeDoi(entry.relatedIdentifier);
  }))].sort();
  if (parents.length > 1) throw new Error(`DataCite lineage for ${doi} has multiple direct ancestors`);
  const titles = data.attributes.titles;
  const title = Array.isArray(titles) && typeof titles[0]?.title === "string" && titles[0].title.trim() ? titles[0].title.trim() : null;
  return { doi, title, parent: parents[0] ?? null, raw: bytes, receipt_sha256: sha256(bytes) };
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
  return [...records.values()].sort((a, b) => a.doi.localeCompare(b.doi)).map(record => {
    const root = resolveRoot(record.doi, records);
    return {
      doi: record.doi,
      title: record.title,
      source_group: `datacite:doi:${record.doi}`,
      source_group_attestation: {
        by: CONNECTOR_ID,
        reason: `DataCite DOI metadata records explicit derivation/version lineage rooted at ${root}`,
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
  const raws = [], seen = new Set();
  let doi = normalizeDoi(startDoi);
  for (let depth = 0; depth <= MAX_LINEAGE_DEPTH; depth += 1) {
    if (seen.has(doi)) throw new Error(`DataCite lineage cycle includes ${doi}`);
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
    if (!record.parent) return raws;
    doi = record.parent;
  }
  throw new Error(`DataCite lineage exceeds depth ${MAX_LINEAGE_DEPTH}`);
}

module.exports = { ANCESTOR_RELATIONS, CONNECTOR_ID, fetchBundle, normalizeDoi, parseRecord, prepareBundle, readResponseBytes, resolveRoot, sha256, storeRawReceipts };
