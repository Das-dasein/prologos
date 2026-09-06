#!/usr/bin/env node
"use strict";

// V6 re-registers the same sealed v5 wire authority under its own immutable
// protocol identity.  It neither calls a provider nor reads a collector.
const { buildRegistry: buildV5, sha256 } = require("./build-wire-authority-prompt-digest-registry-v5");
const { stable } = require("./validate-equal-budget-slots-v1");
async function buildRegistry() {
  const v5 = await buildV5();
  const v6 = { protocol_version: "wire-authority-assembled-prompt-digest-registry-v6", authority_registry: { path: "wire-authority-assembled-prompt-digest-registry-v5.json", sha256: v5.registry_sha256 } };
  return { ...v6, registry_sha256: sha256(stable(v6)) };
}
if (require.main === module) buildRegistry().then(value => console.log(`${JSON.stringify(value, null, 2)}\n`)).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { buildRegistry, sha256 };
