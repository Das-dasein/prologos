"use strict";

// This adapter is deliberately limited to the documented non-interactive
// Codex CLI transport.  It has no SDK, credential, model, or retry default.
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const FINAL_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: { answer: { type: "string", minLength: 1 } },
});

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`);
  return value;
}
function writeExclusive(file, content) { fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode: 0o600 }); }
function completedUsage(events) {
  const completed = events.filter(event => event && event.type === "turn.completed");
  if (completed.length !== 1 || !completed[0].usage || typeof completed[0].usage !== "object") throw new Error("Codex JSONL must contain exactly one completed turn with native usage");
  const usage = completed[0].usage;
  for (const key of ["input_tokens", "output_tokens"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error("Codex completed turn must contain non-negative native integral input_tokens and output_tokens");
  if (Object.prototype.hasOwnProperty.call(usage, "total_tokens") && (!Number.isSafeInteger(usage.total_tokens) || usage.total_tokens < 0 || usage.total_tokens !== usage.input_tokens + usage.output_tokens)) throw new Error("Codex completed turn native total_tokens must reconcile");
  return Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens, effective_context_budget: usage.input_tokens });
}
function parseJsonl(stdout) {
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error("Codex JSONL output is empty");
  try { return lines.map(line => JSON.parse(line)); }
  catch { throw new Error("Codex stdout must be machine-readable JSONL"); }
}

function createCodexExecAnsweringProvider({ config, rawDirectory, spawnImpl = childProcess.spawn, binary = process.env.CODEX_BIN || "codex" }) {
  requireText(config && config.model, "an explicit model");
  if (typeof spawnImpl !== "function") throw new Error("spawnImpl must be a function");
  if (typeof rawDirectory !== "string" || !path.isAbsolute(rawDirectory) || !fs.statSync(rawDirectory).isDirectory()) throw new Error("raw evidence directory must exist and be absolute");
  const schemaFile = path.join(rawDirectory, "codex-final-answer-schema.json");
  const finalFile = path.join(rawDirectory, "codex-final-output.json");
  const stdoutFile = path.join(rawDirectory, "codex-stdout.jsonl");
  const stderrFile = path.join(rawDirectory, "codex-stderr.txt");
  writeExclusive(schemaFile, `${JSON.stringify(FINAL_SCHEMA)}\n`);
  return Object.freeze({ name: "codex-exec", async complete({ prompt }) {
    requireText(prompt, "sealed assembled prompt");
    const args = ["exec", "--ephemeral", "--sandbox", "read-only", "--json", "--model", config.model, "--output-schema", schemaFile, "--output-last-message", finalFile, prompt];
    return new Promise((resolve, reject) => {
      let child, stdout = "", stderr = "", settled = false;
      const fail = error => { if (!settled) { settled = true; reject(error); } };
      try { child = spawnImpl(binary, args, { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] }); }
      catch (error) { fail(error); return; }
      if (!child || !child.stdout || !child.stderr || typeof child.on !== "function") { fail(new Error("Codex spawn must return a child process with stdout and stderr")); return; }
      child.stdout.on("data", chunk => { stdout += String(chunk); });
      child.stderr.on("data", chunk => { stderr += String(chunk); });
      child.on("error", fail);
      child.on("close", code => {
        try {
          writeExclusive(stdoutFile, stdout); writeExclusive(stderrFile, stderr);
          if (code !== 0) throw new Error(`Codex CLI exited with code ${code}: ${(stderr.trim() || stdout.trim() || "no diagnostic output").slice(0, 4000)}`);
          const usage = completedUsage(parseJsonl(stdout));
          if (!fs.existsSync(finalFile)) throw new Error("Codex final output capture is missing");
          const finalText = fs.readFileSync(finalFile, "utf8");
          let final;
          try { final = JSON.parse(finalText); } catch { throw new Error("Codex final output must be JSON"); }
          if (!final || typeof final !== "object" || Array.isArray(final) || Object.keys(final).length !== 1 || typeof final.answer !== "string" || !final.answer.trim()) throw new Error("Codex final output must be the constrained object with a non-empty answer");
          if (!settled) { settled = true; resolve(Object.freeze({ answer: final.answer, raw: JSON.stringify({ stdout_file: path.basename(stdoutFile), stderr_file: path.basename(stderrFile), final_output_file: path.basename(finalFile) }), usage })); }
        } catch (error) { fail(error); }
      });
    });
  } });
}

module.exports = { FINAL_SCHEMA, createCodexExecAnsweringProvider, completedUsage, parseJsonl };
