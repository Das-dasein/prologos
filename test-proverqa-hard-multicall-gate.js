"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { parseMulticallJsonl } = require("./proverqa-hard-multicall-gate");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-multicall-")), scripts = ["a.sh", "b.sh", "c.sh"].map(name => path.join(root, name)); scripts.forEach(file => fs.writeFileSync(file, "#!/bin/sh\n", { mode: 0o700 })); const trace = path.join(root, "trace.jsonl");
const event = (type, id, file, output = "") => ({ type, item: { id, type: "command_execution", command: `/bin/zsh -lc ${file}`, ...(type === "item.completed" ? { status: "completed", exit_code: 0, aggregated_output: output } : { status: "in_progress", exit_code: null, aggregated_output: "" }) } });
const write = events => fs.writeFileSync(trace, [...events, { type: "turn.completed", usage: { input_tokens: 2, output_tokens: 1 } }].map(JSON.stringify).join("\n") + "\n");
try {
  write([event("item.started", "a", scripts[0]), event("item.completed", "a", scripts[0], "BROKER_RESULT: entailed"), event("item.started", "b", scripts[1]), event("item.completed", "b", scripts[1], "BROKER_RESULT: unknown")]);
  assert.deepEqual(parseMulticallJsonl(trace, { brokerPaths: scripts }).inspection.tool_events_observed, 2);
  write([event("item.started", "a", scripts[0]), event("item.completed", "a", scripts[0], "BROKER_RESULT: entailed"), event("item.started", "b", scripts[0]), event("item.completed", "b", scripts[0], "BROKER_RESULT: unknown")]);
  assert.throws(() => parseMulticallJsonl(trace, { brokerPaths: scripts }), /distinct/);
  write([event("item.started", "a", scripts[0]), event("item.completed", "a", scripts[0], "warning")]);
  assert.throws(() => parseMulticallJsonl(trace, { brokerPaths: scripts }), /BROKER_RESULT/);
  write([event("item.started", "a", scripts[0]), event("item.completed", "a", scripts[0], "BROKER_RESULT: entailed"), event("item.started", "b", scripts[1]), event("item.completed", "b", scripts[1], "BROKER_RESULT: unknown"), event("item.started", "c", scripts[2]), event("item.completed", "c", scripts[2], "BROKER_RESULT: unknown"), event("item.started", "d", scripts[2]), event("item.completed", "d", scripts[2], "BROKER_RESULT: unknown")]);
  assert.throws(() => parseMulticallJsonl(trace, { brokerPaths: scripts }), /1\.\.3/);
  console.log("proverqa-hard-multicall-gate ok: 1..3 distinct visible broker results only");
} finally { fs.rmSync(root, { recursive: true, force: true }); }
