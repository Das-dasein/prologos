#!/usr/bin/env node
"use strict";

// Deterministic, no-provider registry builder.  It intentionally invokes the
// existing sealed P0/P1 assembler, never a transport, scorer, or raw artifact.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assembleCondition, immutableInputs } = require("../../../trusted-proof-preflight");
const { stable } = require("./validate-equal-budget-slots-v1");

const root = __dirname;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const manifestCommit = () => (fs.readFileSync(path.join(root, "manifest.md"), "utf8").match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];

// These identifiers are the pinned synthetic no-live template identities used
// by the preflight fixture.  They are identities, not prompt text; the exact
// assembled P0/P1 bytes below are what the registry actually binds.
const NO_LIVE_TEMPLATE_IDENTITIES = Object.freeze({
  base_prompt_sha256: "a".repeat(64),
  wrapper_prompt_sha256: "b".repeat(64),
});

async function buildRegistry() {
  const inputs = immutableInputs();
  const proofRegistry = readJson("trusted-proof-digest-registry-v1.json");
  const sourceCommit = manifestCommit();
  if (!sourceCommit) throw new Error("actual prompt registry: manifest source commit is unavailable");
  const config = {
    source_commit: sourceCommit,
    model: "SYNTHETIC-NOT-A-MODEL",
    ...NO_LIVE_TEMPLATE_IDENTITIES,
    sampling: { temperature: 0, top_p: 1, seed: 0 },
    retry_policy: "none",
    dataset_sha256: inputs.dataset_sha256,
    slot_registration_file_sha256: inputs.registration_sha256,
    slot_registration_sha256: inputs.binding.slot_registration_sha256,
  };
  const case_prompt_digests = {};
  for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) {
    const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0" });
    const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1" });
    case_prompt_digests[fixture.id] = { P0: sha256(p0.prompt), P1: sha256(p1.prompt) };
  }
  const payload = {
    protocol_version: "actual-assembled-prompt-digest-registry-v1",
    source_commit: sourceCommit,
    dataset: { path: "dataset.json", sha256: inputs.dataset_sha256 },
    slot_registration: { path: "slot-registration-v1.json", sha256: inputs.binding.slot_registration_sha256 },
    trusted_proof_digest_registry: { path: "trusted-proof-digest-registry-v1.json", sha256: proofRegistry.registry_sha256 },
    no_live_assembler: {
      path: "trusted-proof-preflight.js",
      template_identities: NO_LIVE_TEMPLATE_IDENTITIES,
    },
    case_prompt_digests,
  };
  return { ...payload, registry_sha256: sha256(stable(payload)) };
}

if (require.main === module) buildRegistry().then(value => console.log(`${JSON.stringify(value, null, 2)}\n`)).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { NO_LIVE_TEMPLATE_IDENTITIES, buildRegistry, sha256 };
