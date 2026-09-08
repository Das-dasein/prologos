"use strict";
// Local OpenAI-compatible function-call loop. It records the model's proposed
// calls verbatim; only the trusted tool session performs Prolog execution.
const crypto = require("node:crypto");
const { localBaseUrl } = require("./lmstudio-free-prolog-generator");
const { createPrologToolSession } = require("./prolog-tool-session");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function nonempty(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`); return value; }
async function body(response) { const text = await response.text(); if (!response.ok) throw new Error(`LM Studio chat completion failed (${response.status}): ${text.slice(0, 4000)}`); return text; }
function hasProofTree(result) { return Boolean(result && typeof result.transcript === "string" && /PAM_DIAGNOSTIC_BINDINGS:[\s\S]*proof_tree\([^,]+,(?:fact|derived)\(/.test(result.transcript)); }
function createLmStudioPrologToolAgent({ baseUrl = "http://127.0.0.1:1234", model, fetchImpl = globalThis.fetch, timeoutMs = 600000, maxTokens = 800, maxSteps = 8 }) {
  const root = localBaseUrl(baseUrl); nonempty(model, "model"); if (typeof fetchImpl !== "function") throw new Error("fetchImpl must be a function"); if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 16) throw new Error("maxSteps must be 1..16");
  return async ({ caseId, prompt, sourceSentences, expectedGoal, targetRuleSourceId, timeoutMs: runTimeoutMs = 4000, maxOutputBytes = 262144 }) => {
    nonempty(caseId, "caseId"); nonempty(prompt, "prompt");
    const session = createPrologToolSession({ caseId, sourceSentences, expectedGoal, targetRuleSourceId, timeoutMs: runTimeoutMs, maxOutputBytes });
    const messages = [{ role: "user", content: prompt }], responses = []; let proved = false;
    for (let step = 0; step < maxSteps; step += 1) {
      const request = { model, temperature: 0, max_tokens: maxTokens, messages, tools: session.tools, tool_choice: proved ? "auto" : "required" };
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs); let raw;
      try { const response = await fetchImpl(`${root}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: controller.signal }); raw = await body(response); } finally { clearTimeout(timer); }
      let envelope; try { envelope = JSON.parse(raw); } catch { throw new Error("LM Studio returned non-JSON tool response"); }
      const message = envelope && envelope.choices && envelope.choices[0] && envelope.choices[0].message;
      if (!message || typeof message !== "object") throw new Error("LM Studio tool response has no assistant message");
      responses.push(Object.freeze({ request, response_sha256: sha256(raw), response: envelope }));
      const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (!calls.length) {
        if (!proved) { const error = new Error("model ended without calling prove"); error.responses = responses; error.calls = session.calls; throw error; }
        return Object.freeze({ final: typeof message.content === "string" ? message.content : "", calls: session.calls, program: session.program(), transport: Object.freeze({ schema_version: "lmstudio-prolog-tool-loop-v1", base_url: root, model, responses }) });
      }
      // Preserve the raw response above, but give the next model turn exactly
      // one completed call/result pair. This prevents a model from emitting
      // declarations and prove in one speculative batch before seeing feedback.
      const call = calls[0], visibleMessage = { ...message, tool_calls: [call] };
      messages.push(visibleMessage);
      const name = call && call.function && call.function.name, rawArgs = call && call.function && call.function.arguments; let args;
      try { args = JSON.parse(rawArgs); } catch { args = null; }
      let result; try { result = await session.execute(name, args); if (name === "prove") proved = hasProofTree(result); } catch (error) { result = { error: String(error && (error.message || error)) }; }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    const error = new Error(`model did not complete within ${maxSteps} tool steps`); error.responses = responses; error.calls = session.calls; throw error;
  };
}
module.exports = { createLmStudioPrologToolAgent, hasProofTree };
