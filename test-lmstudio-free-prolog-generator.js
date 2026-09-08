"use strict";
const assert = require("node:assert/strict");
const { createLmStudioFreePrologGenerator, localBaseUrl } = require("./lmstudio-free-prolog-generator");
(async () => {
  const seen = [];
  const fetchImpl = async (url, options) => { seen.push({ url, options }); return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ program: "calm(ada).\n", query: "calm(ada)" }) } }] }) }; };
  const generate = createLmStudioFreePrologGenerator({ model: "local-test", fetchImpl });
  const output = await generate({ prompt: "write Prolog" });
  assert.equal(output.program, "calm(ada).\n"); assert.equal(output.query, "calm(ada)"); assert.equal(output.transport.model, "local-test"); assert.equal(seen[0].url, "http://127.0.0.1:1234/v1/chat/completions");
  const body = JSON.parse(seen[0].options.body); assert.equal(body.max_tokens, 2048); assert.equal(body.response_format.type, "json_schema"); assert.equal(body.response_format.json_schema.strict, true);
  assert.throws(() => localBaseUrl("https://example.com"), /localhost/);
  await assert.rejects(createLmStudioFreePrologGenerator({ model: "bad", fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: "not json" } }] }) }) })({ prompt: "x" }), /structured output error/);
  console.log("lmstudio-free-prolog-generator ok: local structured program/query transport preserves response evidence");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
