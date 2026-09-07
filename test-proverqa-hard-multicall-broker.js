"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10"), { createBroker } = require("./proverqa-hard-hybrid-broker"), { createMulticallBrokers } = require("./proverqa-hard-multicall-broker");
const fixture = { cases: [{ case_id: "case-1", private_formulas: ["calm(Ada)", "focused(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))"] }] }, root = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-multibroker-"));
try {
  const run = seatbelt.createFreshSealedRunRoot(root), brokers = createMulticallBrokers({ run, item: fixture.cases[0], broker: createBroker(fixture), swiplPath: "/opt/homebrew/bin/swipl" });
  assert.equal(brokers.length, 3); assert.equal(new Set(brokers.map(item => item.brokerFile)).size, 3); assert.equal(new Set(brokers.map(item => item.goal_id)).size, 3);
  if (fs.existsSync("/opt/homebrew/bin/swipl")) for (const item of brokers) { const out = cp.spawnSync(item.brokerFile, { encoding: "utf8" }); assert.equal(out.status, 0); assert.match(out.stdout.trim(), /^BROKER_RESULT: (?:entailed|unknown)$/); assert.equal(out.stdout.trim(), fs.readFileSync(item.receiptFile, "utf8").trim()); }
  console.log("proverqa-hard-multicall-broker ok: distinct sealed scripts with visible receipts");
} finally { fs.rmSync(root, { recursive: true, force: true }); }
