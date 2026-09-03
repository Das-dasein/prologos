function createProvider(name = process.env.LLM_PROVIDER || "codex") {
  if (name === "codex") return require("./codex");
  if (name === "openai-api") return require("./openai-api");
  throw new Error(`Unknown LLM_PROVIDER: ${name}. Use codex or openai-api.`);
}

module.exports = { createProvider };

