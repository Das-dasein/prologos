"use strict";
// Minimal Codex-subscription adapter for the non-scoring free-Prolog probe.
// It intentionally does not use a copied CODEX_HOME/raw cache: model output
// is only a program/query pair, then Prolog executes in a separate sandbox.
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const OUTPUT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["program", "query"], properties: { program: { type: "string" }, query: { type: "string" } } });
function executable(value, label) { if (typeof value !== "string" || !path.isAbsolute(value) || !fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error(`${label} must be an existing absolute file`); return fs.realpathSync(value); }
function invoke({ command, args, cwd, prompt, spawnImpl }) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] }); const out = [], err = [];
    child.stdout.on("data", chunk => out.push(chunk)); child.stderr.on("data", chunk => err.push(chunk)); child.on("error", reject);
    child.on("close", code => {
      const stdout = Buffer.concat(out).toString("utf8"), stderr = Buffer.concat(err).toString("utf8"), detail = stderr.trim() || stdout.trim() || "no diagnostic output";
      return code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`codex exec failed (${code}): ${detail}`));
    });
    child.stdin.end(prompt);
  });
}
function createCodexFreePrologGenerator({ codexPath, model, spawnImpl = childProcess.spawn }) {
  const codex = executable(codexPath, "codexPath"); if (typeof model !== "string" || !model.trim()) throw new Error("model must be non-empty text");
  return async ({ prompt }) => {
    if (typeof prompt !== "string" || !prompt.trim()) throw new Error("prompt must be non-empty text");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-free-prolog-")), schema = path.join(root, "schema.json"), final = path.join(root, "final.json");
    try {
      fs.writeFileSync(schema, JSON.stringify(OUTPUT_SCHEMA), { encoding: "utf8", mode: 0o600 });
      await invoke({ command: codex, args: ["exec", "--json", "--ephemeral", "-C", root, "--skip-git-repo-check", "--sandbox", "read-only", "--model", model, "--output-schema", schema, "--output-last-message", final, "-"], cwd: root, prompt, spawnImpl });
      const parsed = JSON.parse(fs.readFileSync(final, "utf8"));
      if (!parsed || typeof parsed.program !== "string" || !parsed.program.trim() || typeof parsed.query !== "string" || !parsed.query.trim() || Object.keys(parsed).length !== 2) throw new Error("Codex final output violates free-Prolog program/query schema");
      return Object.freeze({ program: parsed.program, query: parsed.query });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  };
}
module.exports = { createCodexFreePrologGenerator };
