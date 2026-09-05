"use strict";

// This module intentionally does not import the OpenAI SDK at module load.
const crypto = require("node:crypto");
const ASSEMBLED_PROMPT_TEMPLATE = "{{assembled_prompt}}";
const WRAPPER_TEMPLATE = "none";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const ASSEMBLED_PROMPT_TEMPLATE_SHA256 = sha256(ASSEMBLED_PROMPT_TEMPLATE);
const WRAPPER_TEMPLATE_SHA256 = sha256(WRAPPER_TEMPLATE);

function nativeUsage(response) {
  const usage = response && response.usage;
  if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || !Number.isSafeInteger(usage.total_tokens) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.total_tokens < 0 || usage.total_tokens !== usage.input_tokens + usage.output_tokens) throw new Error("OpenAI response usage must contain reconciling non-negative native integral input_tokens, output_tokens and total_tokens");
  return Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.total_tokens, effective_context_budget: usage.input_tokens });
}
function defaultClientFactory() { const OpenAI = require("openai"); return new OpenAI(); }
function createOpenAIAnsweringProvider({ config, clientFactory = defaultClientFactory }) {
  if (!config || typeof config.model !== "string" || !config.model.trim()) throw new Error("an explicit model is required");
  if (typeof clientFactory !== "function") throw new Error("clientFactory must be a function");
  let client;
  function getClient() { client ??= clientFactory(); if (!client || !client.responses || typeof client.responses.create !== "function") throw new Error("OpenAI client must expose responses.create"); return client; }
  return Object.freeze({ name: "openai-api", async complete({ prompt }) {
    if (typeof prompt !== "string") throw new Error("sealed assembled prompt must be text");
    // No wrapper and no instructions: these are the only provider arguments.
    const response = await getClient().responses.create({ model: config.model, input: prompt });
    if (!response || !Object.prototype.hasOwnProperty.call(response, "model")) throw new Error("provider response must include model");
    if (typeof response.model !== "string" || !response.model.trim()) throw new Error("provider response model must be non-empty text");
    if (response.model !== config.model) throw new Error(`provider model ${response.model} does not match selected model ${config.model}`);
    return Object.freeze({ answer: String(response.output_text ?? ""), raw: JSON.stringify(response), usage: nativeUsage(response) });
  } });
}
module.exports = { ASSEMBLED_PROMPT_TEMPLATE, WRAPPER_TEMPLATE, ASSEMBLED_PROMPT_TEMPLATE_SHA256, WRAPPER_TEMPLATE_SHA256, createOpenAIAnsweringProvider, nativeUsage };
