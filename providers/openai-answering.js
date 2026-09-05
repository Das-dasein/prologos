"use strict";

// This module intentionally does not import the OpenAI SDK at module load.
const crypto = require("node:crypto");
const ASSEMBLED_PROMPT_TEMPLATE = "{{assembled_prompt}}";
const WRAPPER_TEMPLATE = "none";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const ASSEMBLED_PROMPT_TEMPLATE_SHA256 = sha256(ASSEMBLED_PROMPT_TEMPLATE);
const WRAPPER_TEMPLATE_SHA256 = sha256(WRAPPER_TEMPLATE);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// OpenAI Responses accepts temperature in [0, 2] and top_p in [0, 1].
// This transport intentionally supports no alternative sampling controls.
function canonicalSampling(sampling) {
  if (!sampling || typeof sampling !== "object" || Array.isArray(sampling)) throw new Error("config.sampling must be an object with exactly temperature and top_p");
  const keys = Object.keys(sampling).sort();
  if (keys.length !== 2 || keys[0] !== "temperature" || keys[1] !== "top_p" || !own(sampling, "temperature") || !own(sampling, "top_p")) throw new Error("config.sampling must contain exactly temperature and top_p");
  const { temperature, top_p } = sampling;
  if (!Number.isFinite(temperature) || !Number.isFinite(top_p)) throw new Error("config.sampling.temperature and config.sampling.top_p must be finite numbers");
  if (temperature < 0 || temperature > 2) throw new Error("config.sampling.temperature must be in the OpenAI Responses range [0, 2]");
  if (top_p < 0 || top_p > 1) throw new Error("config.sampling.top_p must be in the OpenAI Responses range [0, 1]");
  return Object.freeze({ temperature, top_p });
}

function nativeUsage(response) {
  const usage = response && response.usage;
  if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || !Number.isSafeInteger(usage.total_tokens) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.total_tokens < 0 || usage.total_tokens !== usage.input_tokens + usage.output_tokens) throw new Error("OpenAI response usage must contain reconciling non-negative native integral input_tokens, output_tokens and total_tokens");
  return Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.total_tokens, effective_context_budget: usage.input_tokens });
}
function defaultClientFactory() { const OpenAI = require("openai"); return new OpenAI(); }
function createOpenAIAnsweringProvider({ config, clientFactory = defaultClientFactory }) {
  if (!config || typeof config.model !== "string" || !config.model.trim()) throw new Error("an explicit model is required");
  if (typeof clientFactory !== "function") throw new Error("clientFactory must be a function");
  const sampling = canonicalSampling(config.sampling);
  let client;
  function getClient() { client ??= clientFactory(); if (!client || !client.responses || typeof client.responses.create !== "function") throw new Error("OpenAI client must expose responses.create"); return client; }
  return Object.freeze({ name: "openai-api", async complete({ prompt }) {
    if (typeof prompt !== "string") throw new Error("sealed assembled prompt must be text");
    // No wrapper or instructions: only the sealed input and pinned sampling.
    const response = await getClient().responses.create({ model: config.model, input: prompt, temperature: sampling.temperature, top_p: sampling.top_p });
    if (!response || !Object.prototype.hasOwnProperty.call(response, "model")) throw new Error("provider response must include model");
    if (typeof response.model !== "string" || !response.model.trim()) throw new Error("provider response model must be non-empty text");
    if (response.model !== config.model) throw new Error(`provider model ${response.model} does not match selected model ${config.model}`);
    return Object.freeze({ answer: String(response.output_text ?? ""), raw: JSON.stringify(response), usage: nativeUsage(response) });
  } });
}
module.exports = { ASSEMBLED_PROMPT_TEMPLATE, WRAPPER_TEMPLATE, ASSEMBLED_PROMPT_TEMPLATE_SHA256, WRAPPER_TEMPLATE_SHA256, canonicalSampling, createOpenAIAnsweringProvider, nativeUsage };
