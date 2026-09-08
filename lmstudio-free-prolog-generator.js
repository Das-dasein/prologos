"use strict";
// Local-only OpenAI-compatible adapter for LM Studio.  It deliberately keeps
// model transport evidence distinct from the Prolog diagnostic that follows.
const crypto = require("node:crypto");

const OUTPUT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["program", "query"], properties: { program: { type: "string" }, query: { type: "string" } } });
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function localBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("baseUrl must be non-empty text");
  const url = new URL(value);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname)) throw new Error("LM Studio adapter only permits a localhost baseUrl");
  if (url.protocol !== "http:") throw new Error("LM Studio adapter requires http");
  return url.toString().replace(/\/$/, "");
}
function nonempty(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`); return value; }
function parseProgramQuery(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2 || typeof value.program !== "string" || !value.program.trim() || typeof value.query !== "string" || !value.query.trim()) throw new Error("LM Studio response violates free-Prolog program/query schema");
  return Object.freeze({ program: value.program, query: value.query });
}
async function responseText(response) { if (!response || typeof response.ok !== "boolean" || typeof response.text !== "function") throw new Error("fetch implementation returned an invalid response"); const body = await response.text(); if (!response.ok) throw new Error(`LM Studio chat completion failed (${response.status}): ${body.slice(0, 4000) || "no diagnostic output"}`); return body; }
function createLmStudioFreePrologGenerator({ baseUrl = "http://127.0.0.1:1234", model, fetchImpl = globalThis.fetch, timeoutMs = 120000, maxTokens = 2048 }) {
  const root = localBaseUrl(baseUrl); nonempty(model, "model"); if (typeof fetchImpl !== "function") throw new Error("fetchImpl must be a function"); if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) throw new Error("timeoutMs must be an integer from 1000 to 600000"); if (!Number.isSafeInteger(maxTokens) || maxTokens < 64 || maxTokens > 16384) throw new Error("maxTokens must be an integer from 64 to 16384");
  return async ({ prompt }) => {
    nonempty(prompt, "prompt");
    const request = Object.freeze({ model, temperature: 0, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "free_prolog_program", strict: true, schema: OUTPUT_SCHEMA } } });
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    let rawResponse;
    try {
      const response = await fetchImpl(`${root}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: controller.signal });
      rawResponse = await responseText(response);
    } catch (error) { throw new Error(`LM Studio transport error: ${String(error && (error.message || error) || error)}`); } finally { clearTimeout(timer); }
    let envelope;
    try { envelope = JSON.parse(rawResponse); } catch { throw new Error("LM Studio returned non-JSON chat completion output"); }
    const content = envelope && envelope.choices && envelope.choices[0] && envelope.choices[0].message && envelope.choices[0].message.content;
    if (typeof content !== "string") throw new Error("LM Studio chat completion has no string choices[0].message.content");
    let output;
    try { output = parseProgramQuery(JSON.parse(content)); } catch (error) { throw new Error(`LM Studio structured output error: ${String(error && (error.message || error) || error)}`); }
    return Object.freeze({ ...output, transport: Object.freeze({ schema_version: "lmstudio-chat-completion-v1", base_url: root, model, request, response_sha256: sha256(rawResponse), response: envelope }) });
  };
}
module.exports = { OUTPUT_SCHEMA, createLmStudioFreePrologGenerator, localBaseUrl, parseProgramQuery };
