"use strict";
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const fs = require("node:fs");
const { createCodexFreePrologGenerator } = require("./codex-free-prolog-generator");
function fakeSpawn(seen) {
  return (command, args, options) => {
    seen.push({ command, args, options }); const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => { const final = args[args.indexOf("--output-last-message") + 1]; fs.writeFileSync(final, JSON.stringify({ program: "ready(ada).\n", query: "ready(ada)" })); child.stdout.end('{"type":"turn.completed"}\n'); child.stderr.end(""); child.emit("close", 0); }); return child;
  };
}
(async () => {
  const seen = [], generate = createCodexFreePrologGenerator({ codexPath: "/bin/echo", model: "fake-codex", spawnImpl: fakeSpawn(seen) });
  const output = await generate({ prompt: "write Prolog" });
  assert.deepEqual(output, { program: "ready(ada).\n", query: "ready(ada)" }); assert.equal(seen.length, 1); assert.ok(seen[0].args.includes("--ephemeral")); assert.ok(seen[0].args.includes("read-only")); assert.equal(seen[0].args.includes("--ignore-user-config"), false);
  console.log("codex-free-prolog-generator ok: ephemeral subscription adapter returns only ordinary program/query");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
