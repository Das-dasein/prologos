#!/usr/bin/env node
"use strict";

// Deterministic v3 registration only.  It rebuilds sealed P0/P1 bytes but
// never constructs a provider, imports an SDK, or reads a live artifact.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assembleCondition, immutableInputs } = require("../../../trusted-proof-preflight");
const wire = require("../../../providers/openai-answering");
const { stable } = require("./validate-equal-budget-slots-v1");

const root = __dirname;
const TRANSPORT_COMMIT = "4b403d1775c3de727f4f2408cada2408435a849d";
const INPUT_MODE = "sealed-assembled-prompt-byte-for-byte";
const TRANSPORT_SOURCES = Object.freeze({
  "providers/openai-answering.js": "0f63008ed51a7e7414ecec762da4e3a29792af489b157e90f53302b4e2493d6a",
  "trusted-proof-answering.js": "4172a23477085d55c65c5d01460a452c938403cf9df76847dea5d82918f475a6",
});
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const manifestCommit = () => (fs.readFileSync(path.join(root, "manifest.md"), "utf8").match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];

function verifiedTransportSources() {
  for (const [file, digest] of Object.entries(TRANSPORT_SOURCES)) {
    const current = sha256(fs.readFileSync(path.join(root, "../../..", file)));
    if (current !== digest) throw new Error(`wire prompt registry: ${file} does not match pinned transport source`);
  }
  return Object.freeze({ ...TRANSPORT_SOURCES });
}

async function buildRegistry() {
  const inputs = immutableInputs(), proofRegistry = readJson("trusted-proof-digest-registry-v1.json");
  const sourceCommit = manifestCommit();
  if (!sourceCommit) throw new Error("wire prompt registry: manifest source commit is unavailable");
  const template_identities = Object.freeze({
    base_prompt_sha256: wire.ASSEMBLED_PROMPT_TEMPLATE_SHA256,
    wrapper_prompt_sha256: wire.WRAPPER_TEMPLATE_SHA256,
  });
  if (!Object.values(template_identities).every(value => /^[0-9a-f]{64}$/.test(value))) throw new Error("wire prompt registry: exported wire identities are invalid");
  const config = { source_commit: sourceCommit, model: "SYNTHETIC-NOT-A-MODEL", ...template_identities,
    sampling: { temperature: 0, top_p: 1, seed: 0 }, retry_policy: "none", dataset_sha256: inputs.dataset_sha256,
    slot_registration_file_sha256: inputs.registration_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256 };
  const case_prompt_digests = {};
  for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) {
    const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0" });
    const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1" });
    case_prompt_digests[fixture.id] = { P0: sha256(p0.prompt), P1: sha256(p1.prompt) };
  }
  const payload = {
    protocol_version: "wire-assembled-prompt-digest-registry-v3", source_commit: sourceCommit,
    dataset: { path: "dataset.json", sha256: inputs.dataset_sha256 },
    slot_registration: { path: "slot-registration-v1.json", sha256: inputs.binding.slot_registration_sha256 },
    trusted_proof_digest_registry: { path: "trusted-proof-digest-registry-v1.json", sha256: proofRegistry.registry_sha256 },
    no_live_assembler: { path: "trusted-proof-preflight.js", template_identities },
    wire_transport: { source_commit: TRANSPORT_COMMIT, source_sha256: verifiedTransportSources(), template_identities, input_mode: INPUT_MODE },
    case_prompt_digests,
  };
  return { ...payload, registry_sha256: sha256(stable(payload)) };
}
if (require.main === module) buildRegistry().then(value => console.log(`${JSON.stringify(value, null, 2)}\n`)).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { INPUT_MODE, TRANSPORT_COMMIT, TRANSPORT_SOURCES, buildRegistry, sha256, verifiedTransportSources };
