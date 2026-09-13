"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { Journal } = require("./journal");
const { check, hash } = require("./checker");

function semantic(result) { const { evidence, ...value } = result; return value; }
async function replay(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(data.version, "agent-world-poc-report-v0");
  for (const [name, digest] of Object.entries(data.code_hashes)) {
    assert.equal(hash(fs.readFileSync(path.join(__dirname, name), "utf8")), digest, `code changed: ${name}`);
  }
  let verifiedRuns = 0, receipts = 0;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-world-replay-"));
  async function verify(snapshot, expected, assumptions = []) {
    const { timeoutMs, inferences, maxFacts, maxOutputBytes } = expected.evidence;
    const actual = await check({ snapshot, query: expected.query, assumptions, timeoutMs, inferences, maxFacts, maxOutputBytes });
    assert.deepEqual(semantic(actual), semantic(expected), "logical replay differs from saved result");
    assert.equal(actual.evidence.input_sha256, expected.evidence.input_sha256);
    verifiedRuns++;
  }
  function load(events) {
    fs.writeFileSync(path.join(dir, "events.jsonl"), events.map(e => JSON.stringify(e)).join("\n") + "\n");
    return new Journal(dir);
  }
  try {
    for (const episode of data.episodes) {
      for (const events of [episode.events, episode.control.events]) {
        load(events);
        for (let i = 0; i < events.length; i++) if (events[i].type === "reflection") {
          const receipt = events[i].payload;
          // Later admissions may share a logical time tick: replay the actual prefix.
          const before = load(events.slice(0, i));
          assert.deepEqual(before.snapshot(receipt.snapshot.at), receipt.snapshot);
          assert.equal(receipt.snapshot_after, receipt.snapshot.sha256);
          await verify(receipt.snapshot, receipt.baseline);
          for (const question of receipt.questions) for (const branch of question.branches) await verify(receipt.snapshot, branch.result, [branch.assumption]);
          assert.equal(load(events.slice(0, i + 1)).snapshot(receipt.snapshot.at).sha256, receipt.snapshot.sha256);
          receipts++;
        }
      }
      const final = load(episode.events);
      assert.equal(final.state().goal.status, "completed");
      for (const continuation of episode.continuation) if (continuation.event === "later_recall_after_outcome") await verify(final.snapshot(), continuation.result);
    }
    return { status: "verified", trajectories: data.episodes.length * 2, reflectionReceipts: receipts, verifiedRuns, scope: "saved logical runs and journal prefixes; no model call or untrusted thought re-execution" };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (require.main === module) replay(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack); process.exitCode = 1; });
module.exports = { replay };
