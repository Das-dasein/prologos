"use strict";
const { spawn } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");

function stable(x) {
  if (Array.isArray(x)) return `[${x.map(stable).join(",")}]`;
  if (x && typeof x === "object") return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${stable(x[k])}`).join(",")}}`;
  return JSON.stringify(x);
}
const hash = x => crypto.createHash("sha256").update(stable(x)).digest("hex");
const clone = x => JSON.parse(JSON.stringify(x));
function program(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 32768) throw new Error("nonempty bounded Prolog source required");
  return text.trim().endsWith(".") ? text.trim() : `${text.trim()}.`;
}
function provenanceId(value, name) {
  if (typeof value !== "string" || !value.trim() || value.length > 256) throw new Error(`${name} must be a bounded nonempty string`);
  return value;
}
const RESERVED = new Set(["neg", "call", "consult", "assert", "asserta", "assertz", "retract", "retractall", "initialization", "halt", "true", "fail", "open", "shell", "read", "write"]);
function registry(value) {
  if (!value || typeof value.version !== "string" || !Array.isArray(value.predicates) || !value.predicates.length) throw new Error("explicit versioned domain projection required");
  const seen = new Set();
  for (const p of value.predicates) {
    if (!/^[a-z][a-z0-9_]*$/.test(p.name) || RESERVED.has(p.name) || !Number.isInteger(p.arity) || p.arity < 0 || p.arity > 4) throw new Error("unsupported predicate declaration");
    const sig = `${p.name}/${p.arity}`;
    if (seen.has(sig)) throw new Error("duplicate predicate signature");
    seen.add(sig);
  }
  return value.predicates.map(({ name, arity }) => ({ name, arity }));
}
function check({ snapshot, query, assumptions = [], mode = "query", importText = "", timeoutMs = 2000, inferences = 1000000, maxFacts = 2048, maxProofSupportSets = 16384, maxOutputBytes = 2 * 1024 * 1024 }) {
  for (const v of [timeoutMs, inferences, maxFacts, maxProofSupportSets, maxOutputBytes]) if (!Number.isSafeInteger(v) || v < 1) throw new Error("positive integer resource limits required");
  if (!["query", "validate", "import_assertions"].includes(mode)) throw new Error("invalid checker mode");
  const predicates = registry(snapshot.ideas);
  if (!Array.isArray(assumptions) || assumptions.length > 8 || snapshot.items.length > 512) throw new Error("checker input limit");
  const items = [...snapshot.items, ...assumptions].map(x => ({
    id: x.id,
    source: provenanceId(x.source, "checker item source"),
    source_group: provenanceId(x.source_group ?? x.source, "checker item source group"),
    program: program(x.program)
  }));
  if (new Set(items.map(x => x.id)).size !== items.length) throw new Error("duplicate checker item identity");
  const request = { mode, registry: predicates, items, query: program(query), import_text: importText, seconds: timeoutMs / 1000, inferences, max_facts: maxFacts, max_proof_support_sets: maxProofSupportSets };
  if (Buffer.byteLength(JSON.stringify(request)) > 1024 * 1024) throw new Error("checker input too large");
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.SWIPL_BIN || "swipl", ["-q", "--stack_limit=64m", "-s", path.join(__dirname, "checker.pl")], { stdio: ["pipe", "pipe", "pipe"] });
    const output = [], errors = []; let bytes = 0, exhausted = null;
    const timer = setTimeout(() => { exhausted = "wall_time"; child.kill("SIGKILL"); }, timeoutMs + 200);
    for (const [stream, target] of [[child.stdout, output], [child.stderr, errors]]) stream.on("data", b => {
      bytes += b.length;
      if (bytes > maxOutputBytes) { exhausted = "output"; child.kill("SIGKILL"); } else target.push(b);
    });
    child.on("error", e => { clearTimeout(timer); reject(e); });
    child.stdin.on("error", () => {});
    child.on("close", code => {
      clearTimeout(timer);
      const evidence = { runtime: "swi-signed-horn-v0", interpreter_sha256: hash(fs.readFileSync(path.join(__dirname, "checker.pl"), "utf8")), input_sha256: hash(request), timeoutMs, inferences, maxFacts, maxProofSupportSets, maxOutputBytes };
      if (exhausted) return resolve({ status: "resource_exhausted", reason: exhausted, evidence });
      if (code !== 0) return resolve({ status: "execution_error", reason: Buffer.concat(errors).toString(), evidence });
      try { resolve({ ...JSON.parse(Buffer.concat(output).toString()), evidence }); }
      catch { resolve({ status: "execution_error", reason: "invalid checker protocol", evidence }); }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
module.exports = { check, hash, stable, clone, program, registry };
