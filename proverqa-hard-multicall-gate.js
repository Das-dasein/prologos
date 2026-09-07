"use strict";

// Strict JSONL audit for a *new* bounded P2-multicall condition. It is not
// used by r3/P2-one-call: every permitted action names one of a finite set of
// sealed scripts, each script can run only once, and the model-visible native
// output must contain exactly the bounded solver result.
const fs = require("node:fs");
const path = require("node:path");

function canonical(value) {
  const resolved = path.resolve(value);
  return fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
}
function commandPath(item, allowed) {
  const command = item && item.command, args = item && item.args;
  const match = typeof command === "string" && command.match(/^\/bin\/zsh (-(?:c|lc)) (\/.*)$/);
  if (match && allowed.has(canonical(match[2]))) return canonical(match[2]);
  if (command === "/bin/zsh" && Array.isArray(args) && args.length === 2 && /^(?:-c|-lc)$/.test(args[0]) && typeof args[1] === "string" && allowed.has(canonical(args[1]))) return canonical(args[1]);
  throw new Error("multicall trace contains a foreign or parameterized command");
}
function parseMulticallJsonl(stdoutFile, { brokerPaths, maxCalls = 3, prohibitedPaths = [], additionalAllowedPaths = [] }) {
  if (!Array.isArray(brokerPaths) || brokerPaths.length < 1 || brokerPaths.length > maxCalls || !brokerPaths.every(value => typeof value === "string" && path.isAbsolute(value))) throw new Error("multicall brokerPaths must contain 1..maxCalls absolute paths");
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 3) throw new Error("multicall maxCalls must be an integer from 1 to 3");
  const lines = fs.readFileSync(stdoutFile, "utf8").split(/\r?\n/).filter(Boolean); if (!lines.length) throw new Error("Codex JSONL trace is empty");
  let events; try { events = lines.map(line => JSON.parse(line)); } catch { throw new Error("Codex JSONL trace is malformed"); }
  const brokers = new Set(brokerPaths.map(value => canonical(value))), allowedPaths = new Set([...brokers, ...additionalAllowedPaths.map(value => canonical(value))]), protectedPaths = prohibitedPaths.map(value => path.resolve(value));
  const lifecycle = events.filter(event => event && /^item\.(?:started|completed)$/.test(event.type) && event.item && event.item.type === "command_execution");
  const otherAction = events.filter(event => !lifecycle.includes(event) && /(?:command_execution|function_call|\btool\b)/i.test(JSON.stringify(event)));
  if (otherAction.length) throw new Error(`multicall trace contains foreign action events: ${otherAction.length}`);
  if (lifecycle.length < 2 || lifecycle.length > maxCalls * 2 || lifecycle.length % 2) throw new Error(`multicall trace must contain 1..${maxCalls} complete broker lifecycle pairs`);
  const pairs = new Map();
  for (const event of lifecycle) {
    const item = event.item, runtime = new Set(["status", "exit_code", "aggregated_output"]);
    for (const key of Object.keys(item)) if (!runtime.has(key) && !["id", "type", "command", "args"].includes(key)) throw new Error("multicall trace contains unexpected command fields");
    if (typeof item.id !== "string" || !item.id) throw new Error("multicall command event has no id");
    const group = pairs.get(item.id) || {}; if (group[event.type]) throw new Error("multicall broker lifecycle is duplicated"); group[event.type] = item; pairs.set(item.id, group);
  }
  const used = new Set();
  for (const group of pairs.values()) {
    if (!group["item.started"] || !group["item.completed"]) throw new Error("multicall broker lifecycle is incomplete");
    const started = commandPath(group["item.started"], brokers), completed = commandPath(group["item.completed"], brokers);
    if (started !== completed || used.has(started)) throw new Error("multicall broker path must be distinct and stable within its lifecycle");
    used.add(started);
    if (String(group["item.completed"].aggregated_output || "").trim() !== "BROKER_RESULT: entailed" && String(group["item.completed"].aggregated_output || "").trim() !== "BROKER_RESULT: unknown") throw new Error("multicall broker output must expose exactly one BROKER_RESULT");
  }
  for (const event of events) for (const text of JSON.stringify(event).match(/\/[A-Za-z0-9_./-]+/g) || []) {
    const clean = text.replace(/:\d+(?::\d+)?$/, "");
    if (allowedPaths.has(canonical(clean))) continue;
    if (protectedPaths.some(value => clean === value || clean.startsWith(`${value}/`))) throw new Error(`prohibited host path exposed in multicall JSONL: ${clean}`);
  }
  const completed = events.filter(event => event && event.type === "turn.completed");
  if (completed.length !== 1 || !completed[0].usage || !Number.isSafeInteger(completed[0].usage.input_tokens) || !Number.isSafeInteger(completed[0].usage.output_tokens)) throw new Error("multicall JSONL requires one completed turn with native usage");
  const usage = completed[0].usage;
  return Object.freeze({ usage: Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens }), inspection: Object.freeze({ tool_events_observed: used.size, broker_actions: Object.freeze([...used]), prohibited_path_exposure: false }) });
}
module.exports = { parseMulticallJsonl };
