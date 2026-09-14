#!/usr/bin/env node
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const V3_FIXTURE = path.resolve(__dirname, "../../.cdr/waves/temporal-receipt-ablation-v3/fixture.json");
const V3_SHA256 = "1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f";
const VERSION = "autonomous-prolog-tool-fixture-v5";
const CONDITIONS = ["N", "A", "G"];
const stable = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const contract = "Return exactly one JSON object with keys status, positive_support_sets, negative_support_sets. Status must be entailed, contradicted, unknown, or conflict. Each support set is a sorted array of item IDs; sort lists lexicographically. Use empty lists when absent. No markdown or explanation.";
function flat(item) { return item.formal_world.active_items.map(({ id, program }) => JSON.stringify({ id, program })).join("\n"); }
function generateFixture() {
  const bytes = fs.readFileSync(V3_FIXTURE); if (sha256(bytes) !== V3_SHA256) throw new Error("v3 source fixture hash mismatch");
  const source = JSON.parse(bytes), cases = source.cases.filter(item => item.stratum.revision_count === 4).map(item => {
    const base = `Determine the four-way signed-Horn status and exact minimal provenance for this final active snapshot. Explicit negation is independent; absence is unknown. You may use available tools if useful.\n${flat(item)}\nQUERY: ${item.formal_world.query}\n${contract}`;
    return { case_id: item.case_id.replace("rav3", "apt5"), stratum: item.stratum, formal_world: item.formal_world, oracle: item.oracle, prompts: { n: base, a: base, g: `${base}\nYou must call world_memory_query exactly once with the QUERY before answering.` } };
  });
  return { schema_version: VERSION, source_fixture: { file: path.relative(path.resolve(__dirname, "../.."), V3_FIXTURE), sha256: V3_SHA256 }, design: { cases: 16, conditions: CONDITIONS, invariant_prompt: "N and A byte-identical; only the available tool schema differs", N: "no tools", A: "world_memory_query available but not required; zero, one, or two first-turn calls allowed", G: "same tool explicitly required once" }, cases };
}
function writeFixture(file, fixture) { const bytes = stable(fixture); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: "wx" }); return { file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) }; }
if (require.main === module) { const output = process.argv[2]; if (!output || process.argv.length !== 3) process.exit(2); try { const fixture = generateFixture(); console.log(JSON.stringify({ status: "ok", cases: fixture.cases.length, ...writeFixture(output, fixture) })); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; } }
module.exports = { CONDITIONS, VERSION, V3_SHA256, generateFixture, stable, writeFixture };
