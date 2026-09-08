"use strict";
const crypto = require("node:crypto"), fs = require("node:fs"), https = require("node:https"), path = require("node:path");
const { createLmStudioPrologToolAgent } = require("./lmstudio-prolog-tool-agent");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function get(url) { return new Promise((resolve, reject) => https.get(url, response => { if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(get(new URL(response.headers.location, url).toString())); const chunks = []; if (response.statusCode !== 200) return reject(new Error(`source download failed (${response.statusCode})`)); response.on("data", x => chunks.push(x)); response.on("end", () => resolve(Buffer.concat(chunks))); response.on("error", reject); }).on("error", reject)); }
async function main(file) {
  const snapshotFile = path.resolve(file), text = fs.readFileSync(snapshotFile, "utf8"), spec = JSON.parse(text);
  if (!spec || spec.schema_version !== "prolog-tool-experiment-snapshot-v1" || spec.status !== "ready-to-run") throw new Error("invalid tool snapshot");
  let row, sourceEvidence;
  try { const source = await get(spec.source.url); if (sha256(source) !== spec.source.sha256) throw new Error("source SHA mismatch"); row = JSON.parse(source).find(x => x.id === spec.source.case_id); if (!row) throw new Error("case missing"); sourceEvidence = { kind: "verified-remote", sha256: spec.source.sha256 }; }
  catch (networkError) {
    if (typeof spec.source_cache !== "string") throw networkError;
    const cacheFile = path.resolve(path.dirname(snapshotFile), spec.source_cache), cacheText = fs.readFileSync(cacheFile, "utf8"), cache = JSON.parse(cacheText), marker = "\n\nWorld:\n", questionMarker = "\n\nQuestion:\n", start = cache.formalization_prompt && cache.formalization_prompt.indexOf(marker);
    if (start < 0) throw new Error("source cache lacks a recoverable world"); const after = cache.formalization_prompt.slice(start + marker.length), end = after.indexOf(questionMarker); if (end < 0 || typeof cache.source_question !== "string") throw new Error("source cache lacks a recoverable question");
    row = { id: cache.probe && cache.probe.source_id, context: after.slice(0, end), question: cache.source_question }; if (row.id !== spec.source.case_id) throw new Error("source cache case mismatch"); sourceEvidence = { kind: "pinned-raw-cache", file: cacheFile, sha256: sha256(cacheText), remote_source_sha256: spec.source.sha256, network_error: String(networkError.message || networkError) };
  }
  const sentences = row.context.match(/[^.]+\./g) || [], sourceSentences = Object.fromEntries(sentences.map((sentence, index) => [`s${index + 1}`, sentence.trim()]));
  const numberedWorld = Object.entries(sourceSentences).map(([id, sentence]) => `${id}: ${sentence}`).join("\n");
  const addendum = typeof spec.prompt_addendum === "string" && spec.prompt_addendum.trim() ? `\n\nDiagnostic guidance (not gold answer):\n${spec.prompt_addendum.trim()}` : "";
  const prompt = `You are a Prolog tool-using reasoner. Do not write Prolog source and do not answer the English A/B/C question. You must decide which relevant source facts and forward Horn rule to add from the numbered world below. Every add_fact/add_rule call MUST cite the exact source_id that licensed it. A sentence beginning with If is a rule, never a fact. Call add_fact and add_rule for the relevant chain, then you MUST call prove for the stated probe goal. Predicate names are your semantic choices; use one spelling consistently between fact, rule, and prove. Only use statements licensed by the cited source. After prove returns, inspect unused_source_ids and correct an assertion if it is not licensed before giving a brief conclusion.\n\nNumbered world:\n${numberedWorld}\n\nProbe goal:\n${spec.probe_goal.predicate}(${spec.probe_goal.subject})${addendum}`;
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${spec.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 });
  const agent = createLmStudioPrologToolAgent({ baseUrl: spec.transport.base_url, model: spec.model, timeoutMs: spec.transport.request_timeout_ms, maxTokens: spec.transport.max_tokens, maxSteps: spec.max_tool_steps });
  try {
    const result = await agent({ caseId: `proverqa-hard-${row.id}`, prompt, sourceSentences, expectedGoal: spec.probe_goal, targetRuleSourceId: spec.target_rule_source_id || null, timeoutMs: spec.runtime.timeout_ms, maxOutputBytes: spec.runtime.max_output_bytes });
    const artifact = { schema_version: "prolog-tool-run-v1", status: "observed-not-scored", snapshot_file: snapshotFile, snapshot_sha256: sha256(text), source_evidence: sourceEvidence, prompt, result };
    fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), JSON.stringify(artifact, null, 2) + "\n", { mode: 0o600 }); process.stdout.write(JSON.stringify({ raw_root: root, calls: result.calls.length, final: result.final }, null, 2) + "\n");
  } catch (error) {
    const artifact = { schema_version: "prolog-tool-run-v1", status: "observed-not-scored", snapshot_file: snapshotFile, snapshot_sha256: sha256(text), source_evidence: sourceEvidence, prompt, failure: { message: String(error && (error.message || error)), calls: error && error.calls || [], responses: error && error.responses || [] } };
    fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), JSON.stringify(artifact, null, 2) + "\n", { mode: 0o600 }); throw error;
  }
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
