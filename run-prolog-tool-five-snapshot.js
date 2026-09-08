"use strict";
const crypto = require("node:crypto"), fs = require("node:fs"), path = require("node:path");
const { createLmStudioPrologToolAgent } = require("./lmstudio-prolog-tool-agent");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const splitSentences = text => (text.replace(/\b(Dr|Mr|Mrs|Ms)\./g, "$1<dot>").match(/[^.]+\./g) || []).map(sentence => sentence.replace(/<dot>/g, "."));
function cachedCase(snapshotFile, spec) {
  const file = path.resolve(path.dirname(snapshotFile), spec.cache_file), text = fs.readFileSync(file, "utf8"), cache = JSON.parse(text), marker = "\n\nWorld:\n", questionMarker = "\n\nQuestion:\n", start = cache.formalization_prompt && cache.formalization_prompt.indexOf(marker);
  if (start < 0) throw new Error(`cache ${file} lacks a recoverable world`);
  const after = cache.formalization_prompt.slice(start + marker.length), end = after.indexOf(questionMarker);
  if (end < 0 || !cache.probe || cache.probe.source_id !== spec.source_id) throw new Error(`cache ${file} does not match case ${spec.source_id}`);
  return { cache_file: file, cache_sha256: sha256(text), context: after.slice(0, end), question: cache.source_question };
}
function promptFor(sourceSentences, goal, addendum) {
  const world = Object.entries(sourceSentences).map(([id, sentence]) => `${id}: ${sentence}`).join("\n");
  return `You are a Prolog tool-using reasoner. Do not write Prolog source and do not answer the English A/B/C question. Work backward from the stated probe goal: first identify a source rule whose consequent could establish it, then add only its necessary source facts and rules. Every add_fact/add_rule call MUST cite the exact source_id that licensed it. A sentence beginning with If is a rule, never a fact. Preserve meaningful content words in predicate names and use one spelling consistently between facts, rules, and prove. You MUST call prove for the stated probe goal; inspect its result before giving a brief conclusion.\n\nNumbered world:\n${world}\n\nProbe goal:\n${goal.predicate}(${goal.subject})${addendum ? `\n\n${addendum}` : ""}`;
}
async function main(file) {
  const snapshotFile = path.resolve(file), text = fs.readFileSync(snapshotFile, "utf8"), snapshot = JSON.parse(text);
  if (!snapshot || snapshot.schema_version !== "prolog-tool-five-snapshot-v1" || snapshot.status !== "ready-to-run" || !Array.isArray(snapshot.cases)) throw new Error("invalid five-case tool snapshot");
  const root = path.join(path.dirname(snapshotFile), "..", `raw-${snapshot.experiment_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`); fs.mkdirSync(root, { mode: 0o700 });
  const agent = createLmStudioPrologToolAgent({ baseUrl: snapshot.transport.base_url, model: snapshot.model, timeoutMs: snapshot.transport.request_timeout_ms, maxTokens: snapshot.transport.max_tokens, maxSteps: snapshot.max_tool_steps });
  const records = [];
  for (const spec of snapshot.cases) {
    const source = cachedCase(snapshotFile, spec), sentences = splitSentences(source.context), sourceSentences = Object.fromEntries(sentences.map((sentence, index) => [`s${index + 1}`, sentence.trim()])), prompt = promptFor(sourceSentences, spec.probe_goal, snapshot.prompt_addendum);
    try {
      const result = await agent({ caseId: `proverqa-hard-${spec.source_id}`, prompt, sourceSentences, expectedGoal: spec.probe_goal, timeoutMs: snapshot.runtime.timeout_ms, maxOutputBytes: snapshot.runtime.max_output_bytes });
      const prove = result.calls.find(call => call.name === "prove"), proof_tree = Boolean(prove && /PAM_DIAGNOSTIC_BINDINGS:[\s\S]*proof_tree\([^,]+,(?:fact|derived)\(/.test(prove.result.transcript));
      records.push({ source_id: spec.source_id, goal: spec.probe_goal, source_evidence: { kind: "pinned-raw-cache", file: source.cache_file, sha256: source.cache_sha256 }, prompt, result, observed: { called_prove: Boolean(prove), proof_tree } });
    } catch (error) {
      records.push({ source_id: spec.source_id, goal: spec.probe_goal, source_evidence: { kind: "pinned-raw-cache", file: source.cache_file, sha256: source.cache_sha256 }, prompt, failure: { message: String(error && (error.message || error)), calls: error && error.calls || [], responses: error && error.responses || [] }, observed: { called_prove: Boolean(error && error.calls && error.calls.some(call => call.name === "prove")), proof_tree: false } });
    }
  }
  const summary = { planned: records.length, called_prove: records.filter(record => record.observed.called_prove).length, proof_tree: records.filter(record => record.observed.proof_tree).length };
  fs.writeFileSync(path.join(root, "aggregate-not-a-score.json"), JSON.stringify({ schema_version: "prolog-tool-five-run-v1", status: "observed-not-scored", snapshot_file: snapshotFile, snapshot_sha256: sha256(text), summary, records }, null, 2) + "\n", { mode: 0o600 });
  process.stdout.write(JSON.stringify({ raw_root: root, summary }, null, 2) + "\n");
}
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
