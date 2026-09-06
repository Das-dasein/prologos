#!/usr/bin/env node
"use strict";

// V8 is a separate authority for the executable Codex transport.  It never
// invokes the transport: it only seals source, command and prompt identities.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assembleCondition, immutableInputs } = require("../../../trusted-proof-preflight");
const { FINAL_SCHEMA } = require("../../../providers/codex-exec-answering");
const { ASSEMBLED_PROMPT_TEMPLATE_SHA256, WRAPPER_TEMPLATE_SHA256 } = require("../../../providers/openai-answering");
const { stable } = require("./validate-equal-budget-slots-v1");
const root = __dirname;
const WIRE_COMMIT = "297b27100da43ece561c437cb27c2baff2abee67";
const INPUT_MODE = "sealed-assembled-prompt-byte-for-byte";
const WIRE_SOURCES = Object.freeze({ "providers/codex-exec-answering.js": "3a68863019dc543352f6dd139979886d7c54e02ece5f757e89387178d3e21922", "trusted-proof-answering.js": "dbd04acf5e9dbaceaa656d8483e9772dfd121cc30d91f278669477e2058a9283" });
const COMMAND = Object.freeze({ executable: "codex", subcommand: "exec", ephemeral: true, sandbox: "read-only", jsonl: true, explicit_model: true, output_schema: true, final_output_capture: true });
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
function verifiedWireSources() { for (const [file, digest] of Object.entries(WIRE_SOURCES)) if (sha256(fs.readFileSync(path.join(root, "../../..", file))) !== digest) throw new Error(`v8 Codex authority: ${file} does not match pinned transport source`); return Object.freeze({ ...WIRE_SOURCES }); }
async function buildRegistry() {
  const inputs = immutableInputs(), proofRegistry = readJson("trusted-proof-digest-registry-v1.json");
  const template_identities = { base_prompt_sha256: ASSEMBLED_PROMPT_TEMPLATE_SHA256, wrapper_prompt_sha256: WRAPPER_TEMPLATE_SHA256 };
  const config = { source_commit: WIRE_COMMIT, model: "SYNTHETIC-NOT-A-MODEL", ...template_identities, sampling: { temperature: 0, top_p: 1 }, retry_policy: "none", dataset_sha256: inputs.dataset_sha256, slot_registration_file_sha256: inputs.registration_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256 };
  const case_prompt_digests = {};
  for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) { const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0" }); const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1" }); case_prompt_digests[fixture.id] = { P0: sha256(p0.prompt), P1: sha256(p1.prompt) }; }
  const payload = { protocol_version: "codex-exec-wire-authority-registry-v8", source_commit: WIRE_COMMIT, dataset: { path: "dataset.json", sha256: inputs.dataset_sha256 }, slot_registration: { path: "slot-registration-v1.json", sha256: inputs.binding.slot_registration_sha256 }, trusted_proof_digest_registry: { path: "trusted-proof-digest-registry-v1.json", sha256: proofRegistry.registry_sha256 }, no_live_assembler: { path: "trusted-proof-preflight.js", template_identities }, config_authority: { sampling: { temperature: 0, top_p: 1 }, retry_policy: "none", slot_registration_file_sha256: inputs.registration_sha256 }, wire: { authority_commit: WIRE_COMMIT, source_sha256: verifiedWireSources(), input_mode: INPUT_MODE, template_identities, final_output_schema: { identity: "codex-final-answer-schema-v1", sha256: sha256(JSON.stringify(FINAL_SCHEMA)) }, command: COMMAND }, case_prompt_digests };
  return { ...payload, registry_sha256: sha256(stable(payload)) };
}
if (require.main === module) buildRegistry().then(value => console.log(`${JSON.stringify(value, null, 2)}\n`)).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { COMMAND, INPUT_MODE, WIRE_COMMIT, WIRE_SOURCES, buildRegistry, sha256, verifiedWireSources };
