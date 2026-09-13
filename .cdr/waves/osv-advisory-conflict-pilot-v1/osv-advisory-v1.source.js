"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const semver = require("semver");

const CONNECTOR_ID = "connector/osv-advisory-v1";
const MAX_RECORD_BYTES = 4 * 1024 * 1024;
const MAX_RECORDS = 64;

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }

function normalizeId(value, name = "OSV id") {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || /[\u0000-\u001f\u007f\s]/.test(value)) throw new Error(`${name} must be a bounded non-whitespace string`);
  return value.trim();
}

function timestamp(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${name} must be an RFC3339 UTC timestamp`);
  return value;
}

function timestampKey(value) {
  const normalized = timestamp(value, "OSV timestamp");
  const match = normalized.match(/^(.*?)(?:\.(\d{1,9}))?Z$/);
  const seconds = Math.floor(Date.parse(`${match[1]}Z`) / 1000);
  return `${String(seconds).padStart(13, "0")}.${(match[2] ?? "").padEnd(9, "0")}`;
}

function rawBuffer(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (buffer.length < 2 || buffer.length > MAX_RECORD_BYTES) throw new Error("OSV record has invalid size");
  return buffer;
}

function parseRecord(raw) {
  const bytes = rawBuffer(raw);
  let document;
  try { document = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("OSV record is not valid JSON"); }
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("OSV record must be an object");
  const id = normalizeId(document.id);
  const schemaVersion = document.schema_version ?? "1.0.0";
  if (!semver.valid(schemaVersion)) throw new Error("OSV schema_version must be semantic versioning");
  const modified = timestamp(document.modified, "OSV modified");
  const withdrawn = document.withdrawn === undefined ? null : timestamp(document.withdrawn, "OSV withdrawn");
  const aliases = document.aliases ?? [];
  if (!Array.isArray(aliases) || aliases.length > 128) throw new Error("OSV aliases must be a bounded array");
  const normalizedAliases = [...new Set(aliases.map(value => normalizeId(value, "OSV alias")))].sort();
  if (normalizedAliases.includes(id)) throw new Error("OSV entry cannot alias itself");
  const affected = document.affected ?? [];
  if (!Array.isArray(affected) || affected.length > 512) throw new Error("OSV affected must be a bounded array");
  return { id, schema_version: schemaVersion, modified, withdrawn, aliases: normalizedAliases, affected, raw: bytes, receipt_sha256: sha256(bytes) };
}

function normalizeTarget(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("OSV target must be an object");
  const ecosystem = normalizeId(value.ecosystem, "OSV ecosystem");
  const name = normalizeId(value.name, "OSV package name");
  const version = normalizeId(value.version, "OSV package version");
  return { ecosystem, name, version };
}

function eventKey(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("OSV range event must be an object");
  const keys = ["introduced", "fixed", "last_affected", "limit"].filter(key => event[key] !== undefined);
  if (keys.length !== 1 || Object.keys(event).length !== 1) throw new Error("OSV range event must contain exactly one supported boundary");
  return keys[0];
}

function compareBoundary(left, right) {
  if (left === right) return 0;
  if (left === "0") return -1;
  if (right === "0") return 1;
  if (left === "*") return 1;
  if (right === "*") return -1;
  if (!semver.valid(left) || !semver.valid(right)) throw new Error("OSV SEMVER boundary is invalid");
  return semver.compare(left, right);
}

function includedInSemverRange(version, range) {
  if (!semver.valid(version)) throw new Error("target version is not valid semantic versioning");
  if (!range || range.type !== "SEMVER" || !Array.isArray(range.events) || !range.events.length || range.events.length > 256) throw new Error("OSV SEMVER range is invalid");
  const events = range.events.map((event, index) => {
    const key = eventKey(event), boundary = normalizeId(event[key], `OSV ${key} boundary`);
    if (key !== "introduced" && boundary === "0") throw new Error(`OSV ${key} boundary cannot be zero`);
    if (key !== "limit" && boundary === "*") throw new Error(`OSV ${key} boundary cannot be infinity`);
    if (!["0", "*"].includes(boundary) && !semver.valid(boundary)) throw new Error(`OSV ${key} boundary is not semantic versioning`);
    return { key, boundary, index };
  });
  if (!events.some(event => event.key === "introduced")) throw new Error("OSV range needs an introduced event");
  if (events.some(event => event.key === "fixed") && events.some(event => event.key === "last_affected")) throw new Error("OSV range cannot mix fixed and last_affected");
  for (let index = 1; index < events.length; index += 1) {
    if (compareBoundary(events[index - 1].boundary, events[index].boundary) > 0) throw new Error("OSV SEMVER events must be ordered by boundary");
  }
  let vulnerable = false;
  for (const event of events) {
    const comparison = compareBoundary(version, event.boundary);
    if (event.key === "introduced" && comparison >= 0) vulnerable = true;
    if (event.key === "fixed" && comparison >= 0) vulnerable = false;
    if (event.key === "last_affected" && comparison > 0) vulnerable = false;
    if (event.key === "limit" && comparison >= 0) vulnerable = false;
  }
  return vulnerable;
}

function assessRecord(record, targetInput) {
  const target = normalizeTarget(targetInput);
  if (record.withdrawn) return { status: "withdrawn", target, reason: "record is withdrawn; withdrawal is not evidence that the package is unaffected" };
  const matches = record.affected.filter(value => value?.package?.ecosystem === target.ecosystem && (value.package.name === target.name || value.package.name === "*"));
  if (!matches.length) return { status: "no_assessment", target, reason: "record has no affected entry for this package" };
  let unsupported = false, evaluatedEvidence = false;
  for (const entry of matches) {
    if (entry.versions !== undefined && !Array.isArray(entry.versions)) throw new Error("OSV versions must be an array");
    if (Array.isArray(entry.versions) && entry.versions.length) {
      evaluatedEvidence = true;
      if (entry.versions.includes(target.version)) return { status: "record_claims_affected", target, reason: "target version is explicitly listed" };
    }
    const ranges = entry.ranges ?? [];
    if (!Array.isArray(ranges) || ranges.length > 256) throw new Error("OSV ranges must be a bounded array");
    for (const range of ranges) {
      if (range?.type !== "SEMVER") { unsupported = true; continue; }
      evaluatedEvidence = true;
      if (includedInSemverRange(target.version, range)) return { status: "record_claims_affected", target, reason: "target version is inside an OSV SEMVER range" };
    }
  }
  if (unsupported) return { status: "unsupported", target, reason: "matching record contains a range type this bounded adapter cannot evaluate" };
  return evaluatedEvidence
    ? { status: "record_does_not_claim_affected", target, reason: "target version is outside the record's explicit versions and SEMVER ranges" }
    : { status: "no_assessment", target, reason: "matching affected entry has no evaluable version evidence" };
}

function aliasFamilies(records) {
  const parents = new Map();
  const ensure = id => { if (!parents.has(id)) parents.set(id, id); };
  const find = id => { ensure(id); let root = id; while (parents.get(root) !== root) root = parents.get(root); let current = id; while (parents.get(current) !== current) { const next = parents.get(current); parents.set(current, root); current = next; } return root; };
  const union = (left, right) => { const a = find(left), b = find(right); if (a !== b) parents.set(b, a); };
  for (const record of records) { ensure(record.id); for (const alias of record.aliases) union(record.id, alias); }
  const members = new Map();
  for (const id of parents.keys()) { const root = find(id); if (!members.has(root)) members.set(root, []); members.get(root).push(id); }
  const canonical = new Map();
  for (const values of members.values()) { values.sort(); for (const id of values) canonical.set(id, values[0]); }
  return canonical;
}

function prepareBundle(rawRecords, targetInput) {
  if (!Array.isArray(rawRecords) || !rawRecords.length || rawRecords.length > MAX_RECORDS) throw new Error("OSV bundle needs 1..64 records");
  const records = rawRecords.map(parseRecord);
  const identities = new Set();
  for (const record of records) {
    const identity = `${record.id}\u0000${record.modified}`;
    if (identities.has(identity)) throw new Error(`duplicate OSV record revision ${record.id} ${record.modified}`);
    identities.add(identity);
  }
  const families = aliasFamilies(records), target = normalizeTarget(targetInput);
  return records.sort((a, b) => a.id.localeCompare(b.id) || timestampKey(a.modified).localeCompare(timestampKey(b.modified))).map(record => ({
    id: record.id,
    modified: record.modified,
    withdrawn: record.withdrawn,
    aliases: record.aliases,
    vulnerability_id: `osv:vulnerability:${families.get(record.id)}`,
    assessment: assessRecord(record, target),
    source_group: `osv:entry:${record.id}@${record.modified}`,
    source_group_attestation: {
      by: CONNECTOR_ID,
      reason: `OSV entry ${record.id} at modified ${record.modified}; aliases identify vulnerability identity, not report provenance`,
      lineage_id: `osv:entry:${record.id}`,
      external_receipt_sha256: record.receipt_sha256,
    },
  }));
}

function prologAtom(value) { return `osv_${sha256(value).slice(0, 20)}`; }

function toWorldItem(descriptor) {
  if (!descriptor || !["record_claims_affected", "record_does_not_claim_affected", "no_assessment", "unsupported", "withdrawn"].includes(descriptor.assessment?.status)) throw new Error("prepared OSV descriptor required");
  if (["no_assessment", "unsupported", "withdrawn"].includes(descriptor.assessment.status)) return null;
  const target = descriptor.assessment.target;
  const literal = `record_claims_affected(${prologAtom(descriptor.vulnerability_id)},${prologAtom(`${target.ecosystem}:${target.name}`)},${prologAtom(target.version)})`;
  return {
    id: `osv_item_${sha256(`${descriptor.id}\u0000${descriptor.modified}\u0000${literal}`).slice(0, 20)}`,
    program: descriptor.assessment.status === "record_claims_affected" ? `${literal}.` : `neg(${literal}).`,
    origin: { kind: "osv_assessment_v1", entry_id: descriptor.id, modified: descriptor.modified, vulnerability_id: descriptor.vulnerability_id, target },
  };
}

function newestRevision(records) {
  if (!Array.isArray(records) || !records.length) throw new Error("OSV revision selection needs records");
  const id = records[0].id;
  if (records.some(record => record.id !== id)) throw new Error("OSV revision selection requires one entry id");
  return [...records].sort((a, b) => timestampKey(a.modified).localeCompare(timestampKey(b.modified))).at(-1);
}

function storeRawReceipts(rawRecords, directory) {
  const target = path.resolve(directory);
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  return rawRecords.map(raw => {
    const bytes = rawBuffer(raw), digest = sha256(bytes), file = path.join(target, `${digest}.json`);
    if (fs.existsSync(file) && !fs.readFileSync(file).equals(bytes)) throw new Error("OSV receipt hash collision");
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, { mode: 0o600, flag: "wx" });
    return file;
  });
}

async function readResponseBytes(response) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RECORD_BYTES) throw new Error("OSV response exceeds size limit");
  if (response.body?.getReader) {
    const reader = response.body.getReader(), chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > MAX_RECORD_BYTES) {
        await reader.cancel("OSV response exceeds size limit");
        throw new Error("OSV response exceeds size limit");
      }
      chunks.push(chunk);
    }
    return rawBuffer(Buffer.concat(chunks, total));
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return rawBuffer(bytes);
}

async function fetchRecord(idInput, { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation required");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error("OSV timeout must be 1..60000 ms");
  const id = normalizeId(idInput), controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response?.ok) throw new Error(`OSV request for ${id} failed with HTTP ${response?.status ?? "unknown"}`);
    const bytes = await readResponseBytes(response), record = parseRecord(bytes);
    if (record.id !== id) throw new Error("OSV response does not match requested id");
    return bytes;
  } finally { clearTimeout(timer); }
}

module.exports = { CONNECTOR_ID, MAX_RECORD_BYTES, MAX_RECORDS, aliasFamilies, assessRecord, fetchRecord, includedInSemverRange, newestRevision, normalizeId, normalizeTarget, parseRecord, prepareBundle, prologAtom, readResponseBytes, sha256, storeRawReceipts, timestampKey, toWorldItem };
