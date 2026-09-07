"use strict";
// Collection seam for a deliberately non-scoring, free-Prolog diagnostic.
// A transport supplies ordinary Prolog source; the collector only preserves it
// and hands it to the existing isolated thought runtime.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
function promptFor(item) {
  return `Read this logical world and question. Write ordinary SWI-Prolog source that you believe helps test one relevant hypothesis, plus one Prolog query to execute. You may use normal facts, rules, helper predicates, and built-ins; do not call the shell, read files, use network, or add directives. This is an exploratory diagnostic, not a request for a final A/B/C answer. Return JSON only: {"program":"...","query":"..."}.\n\nWorld:\n${item.context}\n\nQuestion:\n${item.question}\n`;
}
function validateFixture(fixture) {
  if (!fixture || fixture.schema_version !== "free-prolog-diagnostic-fixture-v1" || !Array.isArray(fixture.cases) || fixture.cases.length < 1) throw new Error("expected non-empty free-Prolog diagnostic fixture");
  const ids = new Set();
  for (const item of fixture.cases) {
    if (!item || typeof item.case_id !== "string" || !item.case_id || ids.has(item.case_id) || typeof item.context !== "string" || !item.context || typeof item.question !== "string" || !item.question) throw new Error("malformed diagnostic case");
    ids.add(item.case_id);
  }
}
function freshRoot(rawRoot) { if (typeof rawRoot !== "string" || !path.isAbsolute(rawRoot) || fs.existsSync(rawRoot) || !fs.existsSync(path.dirname(rawRoot))) throw new Error("rawRoot must be a fresh absolute path with an existing parent"); fs.mkdirSync(rawRoot, { mode: 0o700 }); }
async function collect({ fixture, rawRoot, generate, timeoutMs = 1500, maxOutputBytes = 256 * 1024 }) {
  validateFixture(fixture); freshRoot(rawRoot); if (typeof generate !== "function") throw new Error("generate must be a function");
  const fixtureText = stable(fixture), fixtureSha = sha256(fixtureText), records = [];
  for (const item of fixture.cases) {
    const prompt = promptFor(item); let generated, observation = null, transportError = null;
    try {
      generated = await generate({ caseId: item.case_id, prompt });
      if (!generated || typeof generated.program !== "string" || typeof generated.query !== "string") throw new Error("generator must return program and query strings");
      observation = await runFreePrologDiagnostic({ caseId: item.case_id, program: generated.program, query: generated.query, source: "diagnostic-agent", timeoutMs, maxOutputBytes });
    } catch (error) { transportError = String(error && (error.stack || error.message) || error); }
    const record = Object.freeze({ case_id: item.case_id, fixture_sha256: fixtureSha, prompt_sha256: sha256(prompt), generated: generated ? { program: generated.program, query: generated.query } : null, observation, transport_error: transportError });
    fs.writeFileSync(path.join(rawRoot, `${item.case_id}.json`), stable(record), { encoding: "utf8", flag: "wx", mode: 0o600 }); records.push(record);
  }
  const result = Object.freeze({ schema_version: "free-prolog-diagnostic-run-v1", status: "observed-not-scored", fixture_sha256: fixtureSha, records: Object.freeze(records) });
  fs.writeFileSync(path.join(rawRoot, "aggregate-not-a-score.json"), stable(result), { encoding: "utf8", flag: "wx", mode: 0o600 }); return result;
}
module.exports = { collect, promptFor, validateFixture };
