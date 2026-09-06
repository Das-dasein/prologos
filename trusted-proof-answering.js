"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { executeWithInjectedProvider, requireImmutableConfig } = require("./trusted-proof-preflight");
const { ASSEMBLED_PROMPT_TEMPLATE_SHA256, WRAPPER_TEMPLATE_SHA256, canonicalSampling, createOpenAIAnsweringProvider } = require("./providers/openai-answering");
const { createCodexExecAnsweringProvider } = require("./providers/codex-exec-answering");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function requireWireConfig(config, inputs, provider = "openai-api") {
  const immutable = requireImmutableConfig(config, inputs);
  if (Object.hasOwn(config, "provider") && config.provider !== provider) throw new Error("config.provider must match selected provider");
  if (immutable.base_prompt_sha256 !== ASSEMBLED_PROMPT_TEMPLATE_SHA256) throw new Error("config.base_prompt_sha256 does not match sealed assembled-prompt wire template");
  if (immutable.wrapper_prompt_sha256 !== WRAPPER_TEMPLATE_SHA256) throw new Error("config.wrapper_prompt_sha256 does not match no-wrapper wire template");
  return Object.freeze({ ...immutable, ...(provider === "openai-api" ? { sampling: canonicalSampling(immutable.sampling) } : {}) });
}
function requireFreshRawDirectory(rawDirectory) {
  if (typeof rawDirectory !== "string" || !path.isAbsolute(rawDirectory)) throw new Error("raw output directory must be a fresh absolute path");
  if (fs.existsSync(rawDirectory)) throw new Error("raw output directory must not already exist");
  if (!fs.statSync(path.dirname(rawDirectory)).isDirectory()) throw new Error("raw output directory parent must exist");
}
function writeExclusive(file, content) { fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode: 0o600 }); }
function writeLocalEvidence({ directory, assembled, response, config, provider = "openai-api" }) {
  const promptFile = path.join(directory, "submitted-prompt.txt"), rawFile = path.join(directory, "provider-response.raw.json"), metadataFile = path.join(directory, "metadata.json");
  writeExclusive(promptFile, assembled.prompt); writeExclusive(rawFile, response.raw);
  const metadata = { schema_version: provider === "openai-api" ? "trusted-proof-openai-answering-local-v1" : "trusted-proof-codex-exec-answering-local-v1", cdr_status: "not-a-cdr-receipt-v2", provider, model: config.model, condition: assembled.condition, case_id: assembled.case_id, submitted_prompt: { file: path.basename(promptFile), sha256: sha256(assembled.prompt) }, provider_response: { file: path.basename(rawFile), sha256: sha256(response.raw) }, usage: response.usage, base_prompt_sha256: config.base_prompt_sha256, wrapper_prompt_sha256: config.wrapper_prompt_sha256 };
  writeExclusive(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
  return Object.freeze({ prompt_file: promptFile, raw_file: rawFile, metadata_file: metadataFile });
}
function prepareOpenAIAnsweringRun({ provider, allowLiveProvider, config, inputs, rawDirectory, clientFactory }) {
  // All gates precede provider creation, SDK import, client construction and network.
  if (provider !== "openai-api") throw new Error("live answering requires fixed provider openai-api");
  if (allowLiveProvider !== true) throw new Error("live answering requires --allow-live-provider");
  const immutableConfig = requireWireConfig(config, inputs); requireFreshRawDirectory(rawDirectory);
  fs.mkdirSync(rawDirectory, { mode: 0o700 });
  const transport = createOpenAIAnsweringProvider({ config: immutableConfig, clientFactory });
  return Object.freeze({ provider: "openai-api", raw_directory: rawDirectory, async run(assembled) {
    const response = await executeWithInjectedProvider(assembled, transport);
    const artifacts = writeLocalEvidence({ directory: rawDirectory, assembled, response, config: immutableConfig });
    return Object.freeze({ response, artifacts, cdr_status: "not-a-cdr-receipt-v2" });
  } });
}
function prepareCodexExecAnsweringRun({ provider, allowLiveProvider, config, inputs, rawDirectory, spawnImpl, binary }) {
  if (provider !== "codex-exec") throw new Error("live answering requires fixed provider codex-exec");
  if (allowLiveProvider !== true) throw new Error("live answering requires --allow-live-provider");
  const immutableConfig = requireWireConfig(config, inputs, "codex-exec"); requireFreshRawDirectory(rawDirectory);
  fs.mkdirSync(rawDirectory, { mode: 0o700 });
  const transport = createCodexExecAnsweringProvider({ config: immutableConfig, rawDirectory, spawnImpl, binary });
  return Object.freeze({ provider: "codex-exec", raw_directory: rawDirectory, async run(assembled) {
    const response = await executeWithInjectedProvider(assembled, transport);
    const artifacts = writeLocalEvidence({ directory: rawDirectory, assembled, response, config: immutableConfig, provider: "codex-exec" });
    return Object.freeze({ response, artifacts, cdr_status: "not-a-cdr-receipt-v2" });
  } });
}
function prepareAnsweringRun(options) {
  if (options && options.provider === "openai-api") return prepareOpenAIAnsweringRun(options);
  if (options && options.provider === "codex-exec") return prepareCodexExecAnsweringRun(options);
  throw new Error("live answering requires fixed provider openai-api or codex-exec");
}
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { const token = argv[i]; if (token === "--allow-live-provider") result.allowLiveProvider = true; else if (["--provider", "--config", "--model", "--raw-output-dir"].includes(token) && argv[i + 1]) result[{ "--provider": "provider", "--config": "config", "--model": "model", "--raw-output-dir": "rawDirectory" }[token]] = argv[++i]; else throw new Error("usage: --provider openai-api|codex-exec --allow-live-provider --config FILE --model MODEL --raw-output-dir ABSOLUTE_DIR"); } return result; }
module.exports = { prepareAnsweringRun, prepareOpenAIAnsweringRun, prepareCodexExecAnsweringRun, parseArgs, requireFreshRawDirectory, requireWireConfig, writeLocalEvidence };
if (require.main === module) { try { const args = parseArgs(process.argv.slice(2)); if (!args.allowLiveProvider) console.log(JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0 })); else { if (!args.provider || !args.config || !args.model || !args.rawDirectory) throw new Error("live preparation requires provider, immutable config, explicit model and fresh absolute raw-output directory"); const { immutableInputs } = require("./trusted-proof-preflight"); const config = JSON.parse(fs.readFileSync(args.config, "utf8")); if (config.model !== args.model) throw new Error("--model must match immutable config model"); prepareAnsweringRun({ provider: args.provider, allowLiveProvider: true, config, inputs: immutableInputs(), rawDirectory: args.rawDirectory }); console.log(JSON.stringify({ status: "adapter-prepared-no-provider-call", provider_calls: 0, cdr_status: "not-a-cdr-receipt-v2" })); } } catch (error) { console.error(`answering: ${error.message}`); process.exitCode = 1; } }
