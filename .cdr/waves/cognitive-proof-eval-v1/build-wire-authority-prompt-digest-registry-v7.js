#!/usr/bin/env node
"use strict";

// V7 re-registers the same sealed receipt authority after PR #48 repaired the
// native OpenAI ResponseUsage shape validation.  It owns only wire sources.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assembleCondition, immutableInputs } = require("../../../trusted-proof-preflight");
const wire = require("../../../providers/openai-answering");
const { stable } = require("./validate-equal-budget-slots-v1");
const root = __dirname;
const WIRE_COMMIT = "7f0a58cddd0966c8b1834f66ece726d2b60d184e";
const INPUT_MODE = "sealed-assembled-prompt-byte-for-byte";
const SAMPLING = Object.freeze({ keys: ["temperature", "top_p"], temperature: { minimum: 0, maximum: 2 }, top_p: { minimum: 0, maximum: 1 }, request_mapping: { temperature: "responses.create.temperature", top_p: "responses.create.top_p" } });
const WIRE_SOURCES = Object.freeze({ "providers/openai-answering.js": "bb8ffb58fa39930ff3656f4c73091b27dd452c7654ab37b1514e61726f941299", "trusted-proof-answering.js": "b19e21499fb279f67be53b9ce425425d0c5f10f12f65e6cc23c746fbc4d62911" });
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
function verifiedWireSources() { for (const [file, digest] of Object.entries(WIRE_SOURCES)) if (sha256(fs.readFileSync(path.join(root, "../../..", file))) !== digest) throw new Error(`v7 wire authority registry: ${file} does not match pinned transport source`); return Object.freeze({ ...WIRE_SOURCES }); }
async function buildRegistry() {
  const inputs = immutableInputs(), proofRegistry = readJson("trusted-proof-digest-registry-v1.json");
  const template_identities = Object.freeze({ base_prompt_sha256: wire.ASSEMBLED_PROMPT_TEMPLATE_SHA256, wrapper_prompt_sha256: wire.WRAPPER_TEMPLATE_SHA256 });
  if (!Object.values(template_identities).every(value => /^[0-9a-f]{64}$/.test(value))) throw new Error("v7 wire authority registry: invalid literal template identity");
  const config = { source_commit: WIRE_COMMIT, model: "SYNTHETIC-NOT-A-MODEL", ...template_identities, sampling: { temperature: 0, top_p: 1 }, retry_policy: "none", dataset_sha256: inputs.dataset_sha256, slot_registration_file_sha256: inputs.registration_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256 };
  const case_prompt_digests = {};
  for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) { const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0" }); const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1" }); case_prompt_digests[fixture.id] = { P0: sha256(p0.prompt), P1: sha256(p1.prompt) }; }
  const payload = { protocol_version: "wire-authority-assembled-prompt-digest-registry-v7", source_commit: WIRE_COMMIT, dataset: { path: "dataset.json", sha256: inputs.dataset_sha256 }, slot_registration: { path: "slot-registration-v1.json", sha256: inputs.binding.slot_registration_sha256 }, trusted_proof_digest_registry: { path: "trusted-proof-digest-registry-v1.json", sha256: proofRegistry.registry_sha256 }, no_live_assembler: { path: "trusted-proof-preflight.js", template_identities }, wire: { authority_commit: WIRE_COMMIT, source_sha256: verifiedWireSources(), template_identities, input_mode: INPUT_MODE, sampling: SAMPLING }, case_prompt_digests };
  return { ...payload, registry_sha256: sha256(stable(payload)) };
}
if (require.main === module) buildRegistry().then(value => console.log(`${JSON.stringify(value, null, 2)}\n`)).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { INPUT_MODE, SAMPLING, WIRE_COMMIT, WIRE_SOURCES, buildRegistry, sha256, verifiedWireSources };
