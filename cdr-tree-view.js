"use strict";

// Human-readable derived view of the JSONL pilot. JSONL remains the pinned
// machine source of truth; this view is intentionally lossy and read-only.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const file = process.argv[2] || ".cdr/datasets/dialogues-pilot-v1.jsonl";
const records = fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const sha = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const out = [`tree_version: cdr-dialogues-v1`, `source: ${path.normalize(file)}`, `source_sha256: ${sha}`, ""];
for (const record of records) {
  out.push(`case ${record.case_id} [${record.category}]`);
  record.dialogue.forEach((turn, index) => out.push(`  turn ${index + 1} ${turn.speaker}: ${turn.text}`));
  out.push("  gold");
  for (const operation of record.gold_operations) {
    if (operation.kind === "write") {
      const p = operation.proposal;
      out.push(`    turn ${operation.turn} write ${operation.claim_id}: ${p.polarity} ${p.relation}(${p.arguments.join(", ")})`);
    } else if (operation.kind === "supersede") out.push(`    turn ${operation.turn} supersede ${operation.old_claim_id} -> ${operation.new_claim_id}`);
    else out.push(`    turn ${operation.turn} ${operation.kind}`);
  }
  out.push(`  oracle active=${record.oracle.active_claims.join(",") || "none"} conflicts=${record.oracle.conflicts.length} answers=${record.oracle.query_answers.length}`);
  out.push("");
}
process.stdout.write(`${out.join("\n")}\n`);
