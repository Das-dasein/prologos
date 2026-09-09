"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const audit = require("./near-signature-reflection-run");

const wave = ".cdr/waves/near-signature-constructed-v1";
const marker = "\n\nAdvisory near_signature_audit (read-only; it did not change the candidate):\n";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
};

function validateProtocol(fixture, protocol) {
  if (protocol.status !== "frozen-before-model-output" || protocol.retry_policy !== "none") throw Error("protocol_not_frozen_no_retry");
  if (!Array.isArray(fixture.cases) || fixture.cases.length !== 16) throw Error("fixture_size_invalid");
  const ids = fixture.cases.map(item => item.case_id);
  if (new Set(ids).size !== 16) throw Error("fixture_case_ids_not_unique");
  for (const field of ["order", "strata"]) {
    const keys = Object.keys(protocol[field] || {}).sort();
    if (JSON.stringify(keys) !== JSON.stringify([...ids].sort())) throw Error(`protocol_${field}_does_not_match_fixture`);
  }
  for (const stratum of ["real", "control"]) {
    const members = ids.filter(id => protocol.strata[id] === stratum);
    if (members.length !== 8) throw Error(`stratum_size_invalid:${stratum}`);
    const orders = members.map(id => protocol.order[id]);
    if (orders.filter(order => order === "baseline_first").length !== 4 || orders.filter(order => order === "enhanced_first").length !== 4) throw Error(`counterbalance_invalid:${stratum}`);
  }
  if (Object.values(protocol.order).some(order => !["baseline_first", "enhanced_first"].includes(order))) throw Error("order_value_invalid");
}

function frozenInputs() {
  const fixtureText = fs.readFileSync(path.join(wave, "fixture-v1.json"), "utf8");
  const goldText = fs.readFileSync(path.join(wave, "gold-v1.json"), "utf8");
  const protocolText = fs.readFileSync(path.join(wave, "protocol-v1.json"), "utf8");
  const expectedProtocolHash = fs.readFileSync(path.join(wave, "protocol-v1.sha256"), "utf8").trim();
  const fixture = JSON.parse(fixtureText);
  const gold = JSON.parse(goldText);
  const protocol = JSON.parse(protocolText);
  if (fixture.status !== "frozen-before-model-output" || gold.status !== "frozen-evaluator-only" || sha256(fixtureText) !== protocol.fixture_sha256 || sha256(goldText) !== protocol.gold_sha256 || sha256(protocolText) !== expectedProtocolHash) throw Error("frozen_hash_gate_failed");
  validateProtocol(fixture, protocol);
  return { fixture, protocol, hashes: { fixture: sha256(fixtureText), gold: sha256(goldText), protocol: sha256(protocolText) } };
}

async function preflight(fixture) {
  const prepared = [];
  for (const item of fixture.cases) {
    const certificates = await audit.certificates(item.case_id, item);
    const baseline = audit.reviewPrompt(item, item, certificates.standard, null);
    const enhanced = audit.reviewPrompt(item, item, certificates.standard, certificates.near);
    const position = enhanced.indexOf(marker);
    if (!certificates.near_has_pairs || !certificates.outcome.every(outcome => outcome === "succeeded") || position < 0 || enhanced.slice(0, position) !== baseline || enhanced.slice(position + marker.length) !== certificates.near) throw Error(`preflight_failed:${item.case_id}`);
    prepared.push({ item, certificates });
  }
  return prepared;
}

async function run(rawRoot) {
  if (fs.existsSync(rawRoot)) throw Error("raw_root_must_not_exist_no_resume");
  const { fixture, protocol, hashes } = frozenInputs();
  const prepared = await preflight(fixture);
  fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
  write(path.join(rawRoot, "provenance.json"), { status: "frozen-constructed-diagnostic", fixture_sha256: hashes.fixture, gold_sha256: hashes.gold, protocol_sha256: hashes.protocol, gold_read_for_hash_only: true, calls_planned: 32, m0_calls: 0, retry_policy: "none" });
  for (const { item, certificates } of prepared) {
    const sequence = protocol.order[item.case_id] === "baseline_first" ? [["m1", null], ["m2", certificates.near]] : [["m2", certificates.near], ["m1", null]];
    const calls = sequence.map(([label, near]) => ({ label, receipt: audit.invoke(audit.reviewPrompt(item, item, certificates.standard, near), audit.REVIEW_SCHEMA, path.join(rawRoot, item.case_id, label), protocol) }));
    write(path.join(rawRoot, item.case_id, "record.json"), { case_id: item.case_id, certificates, calls });
  }
}

if (require.main === module) run(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { frozenInputs, preflight, run, validateProtocol };
