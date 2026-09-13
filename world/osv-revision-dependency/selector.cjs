#!/usr/bin/env node
"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const semver = require("semver");
const { assessRecord, parseRecord, sha256, timestampKey } = require("../osv-advisory");

const REVIEWED_PREFIX = "advisories/github-reviewed/";
const DETERMINATE = new Set(["record_claims_affected", "record_does_not_claim_affected"]);

function git(repository, args, options = {}) {
  return childProcess.execFileSync("git", ["-C", repository, ...args], { encoding: options.encoding ?? "utf8", maxBuffer: 128 * 1024 * 1024, timeout: 120000 });
}

function recordAt(repository, commit, file) {
  return Buffer.from(git(repository, ["show", `${commit}:${file}`], { encoding: "buffer" }));
}

function npmPackages(record) {
  return [...new Set(record.affected.filter(entry => entry?.package?.ecosystem === "npm" && typeof entry.package.name === "string").map(entry => entry.package.name))].sort();
}

function probeVersions(records, packageName) {
  const values = new Set();
  for (const record of records) for (const entry of record.affected) {
    if (entry?.package?.ecosystem !== "npm" || entry.package.name !== packageName) continue;
    for (const version of Array.isArray(entry.versions) ? entry.versions : []) if (semver.valid(version)) values.add(version);
    for (const range of Array.isArray(entry.ranges) ? entry.ranges : []) for (const event of Array.isArray(range?.events) ? range.events : []) {
      const boundary = event.introduced ?? event.fixed ?? event.last_affected ?? event.limit;
      if (!semver.valid(boundary)) continue;
      const parsed = semver.parse(boundary);
      const previous = parsed.prerelease.length ? null
        : parsed.patch > 0 ? `${parsed.major}.${parsed.minor}.${parsed.patch - 1}`
          : parsed.minor > 0 ? `${parsed.major}.${parsed.minor - 1}.0`
            : parsed.major > 0 ? `${parsed.major - 1}.0.0` : null;
      if (previous) values.add(previous);
      values.add(boundary);
      const next = semver.inc(boundary, "patch");
      if (next) values.add(next);
    }
  }
  return [...values].sort((left, right) => semver.compare(left, right) || left.localeCompare(right));
}

function deriveTransition(oldRecord, newRecord) {
  if (oldRecord.id !== newRecord.id) return null;
  const packages = [...new Set([...npmPackages(oldRecord), ...npmPackages(newRecord)])].sort();
  let withdrawalCandidate = null;
  for (const packageName of packages) for (const version of probeVersions([oldRecord, newRecord], packageName)) {
    const target = { ecosystem: "npm", name: packageName, version };
    const before = assessRecord(oldRecord, target), after = assessRecord(newRecord, target);
    if (newRecord.withdrawn && !oldRecord.withdrawn && DETERMINATE.has(before.status)) {
      const candidate = { kind: "withdrawal", target, before, after };
      if (before.status === "record_claims_affected") return candidate;
      withdrawalCandidate ??= candidate;
    }
    if (DETERMINATE.has(before.status) && DETERMINATE.has(after.status) && before.status !== after.status) return { kind: "classification_flip", target, before, after };
  }
  return withdrawalCandidate;
}

function changedPathCounts(repository, commit) {
  const output = git(repository, ["log", "--format=", "--name-only", commit, "--", REVIEWED_PREFIX]);
  const counts = new Map();
  for (const file of output.split("\n")) if (file.startsWith(REVIEWED_PREFIX) && file.endsWith(".json")) counts.set(file, (counts.get(file) ?? 0) + 1);
  return counts;
}

function storeReceipt(raw, directory) {
  const digest = sha256(raw), file = path.join(directory, `${digest}.json`);
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(file) && !fs.readFileSync(file).equals(raw)) throw new Error("OSV selector receipt hash collision");
  if (!fs.existsSync(file)) fs.writeFileSync(file, raw, { flag: "wx", mode: 0o600 });
  return { sha256: digest, file };
}

function selectCases({ repository, commit, count = 24, receiptDirectory }) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 128) throw new Error("case count must be 1..128");
  const resolved = git(repository, ["rev-parse", `${commit}^{commit}`]).trim();
  if (resolved !== commit) throw new Error("selector commit must be a full exact commit id");
  const shallow = git(repository, ["rev-parse", "--is-shallow-repository"]).trim() === "true";
  if (shallow) throw new Error("selector requires the complete advisory-database commit graph");
  const paths = [...changedPathCounts(repository, commit)].filter(([, changes]) => changes >= 2).map(([file]) => file).sort();
  const cases = [], exclusions = {}, scanned = [];
  const exclude = reason => { exclusions[reason] = (exclusions[reason] ?? 0) + 1; };
  for (const file of paths) {
    if (cases.length === count) break;
    scanned.push(file);
    let current;
    try { current = parseRecord(recordAt(repository, commit, file)); } catch { exclude("current_record_invalid_or_missing"); continue; }
    if (!npmPackages(current).length) { exclude("not_currently_npm"); continue; }
    const commits = git(repository, ["log", "--format=%H", commit, "--", file]).trim().split("\n").filter(Boolean);
    let selected = null;
    for (let index = 0; index + 1 < commits.length && !selected; index += 1) {
      let newerRaw, olderRaw, newer, older;
      try {
        newerRaw = recordAt(repository, commits[index], file); olderRaw = recordAt(repository, commits[index + 1], file);
        newer = parseRecord(newerRaw); older = parseRecord(olderRaw);
      } catch { continue; }
      if (older.id !== current.id || newer.id !== current.id || timestampKey(older.modified) >= timestampKey(newer.modified)) continue;
      let transition;
      try { transition = deriveTransition(older, newer); } catch { continue; }
      if (transition) selected = { olderRaw, newerRaw, older, newer, olderCommit: commits[index + 1], newerCommit: commits[index], transition };
    }
    if (!selected) { exclude("no_eligible_adjacent_revision"); continue; }
    const oldReceipt = storeReceipt(selected.olderRaw, receiptDirectory), newReceipt = storeReceipt(selected.newerRaw, receiptDirectory);
    cases.push({
      case_id: `osv-revision-${String(cases.length + 1).padStart(3, "0")}`,
      entry_id: current.id,
      advisory_path: file,
      target: selected.transition.target,
      transition: { kind: selected.transition.kind, before: selected.transition.before.status, after: selected.transition.after.status },
      old_revision: { commit: selected.olderCommit, modified: selected.older.modified, receipt_sha256: oldReceipt.sha256 },
      new_revision: { commit: selected.newerCommit, modified: selected.newer.modified, receipt_sha256: newReceipt.sha256 },
    });
  }
  if (cases.length !== count) throw new Error(`only ${cases.length} eligible cases found before exhausting ${paths.length} changed paths`);
  return { schema_version: "osv-revision-dependency-fixture-v1", repository_url: "https://github.com/github/advisory-database.git", repository_commit: commit, selection: { requested_cases: count, path_order: "UTF-16 code-unit ascending", pair_order: "newest adjacent qualifying revision first", scanned_paths: scanned.length, exclusions }, cases };
}

function option(argv, name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; }

function main(argv = process.argv.slice(2)) {
  const repository = option(argv, "--repo"), commit = option(argv, "--commit"), out = option(argv, "--out"), receipts = option(argv, "--receipt-dir"), count = Number(option(argv, "--count") ?? 24);
  if (!repository || !commit || !out || !receipts) throw new Error("usage: node selector.cjs --repo REPO --commit FULL_SHA --count 24 --receipt-dir DIR --out fixture.json");
  const output = path.resolve(out);
  if (fs.existsSync(output)) throw new Error("refusing to overwrite selector fixture");
  const fixture = selectCases({ repository: path.resolve(repository), commit, count, receiptDirectory: path.resolve(receipts) });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: fixture.schema_version, cases: fixture.cases.length, scanned_paths: fixture.selection.scanned_paths, out: output })}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
}

module.exports = { DETERMINATE, deriveTransition, npmPackages, probeVersions, selectCases };
