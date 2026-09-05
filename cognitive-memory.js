"use strict";

// Knowledge remains authored as Prolog source. This module owns immutable
// lifecycle metadata and process isolation; it never parses/consults a delta.
const crypto = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const THOUGHT_RUNNER = path.join(__dirname, "cognitive-runner.pl");
const TRUSTED_QUERY_RUNNER = path.join(__dirname, "trusted-query-runner.pl");
const SWIPL = process.env.SWIPL_BIN || "swipl";
const SANDBOX = "/usr/bin/sandbox-exec";

function digest(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function text(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`); return value; }

function createSnapshot({ id, items = [], parentId = null }) {
  text(id, "snapshot id"); if (!Array.isArray(items)) throw new Error("snapshot items must be an array");
  const copy = items.map(item => {
    if (!item || typeof item !== "object") throw new Error("snapshot item must be an object");
    text(item.id, "item id"); text(item.program, "item program"); text(item.source, "item source");
    if (item.status !== "accepted") throw new Error("only explicitly accepted items belong in a memory snapshot");
    return Object.freeze({ ...item });
  });
  if (new Set(copy.map(item => item.id)).size !== copy.length) throw new Error("snapshot item IDs must be unique");
  const body = { id, parentId, items: Object.freeze(copy) };
  return Object.freeze({ ...body, sha256: digest(stable(body)) });
}
function createCandidate({ id, program, source, support = [] }) {
  text(id, "candidate id"); text(program, "candidate program"); text(source, "candidate source");
  if (!Array.isArray(support)) throw new Error("candidate support must be an array");
  const body = { id, program, source, support: [...support], status: "candidate" };
  return Object.freeze({ ...body, sha256: digest(stable(body)) });
}
function serializeSnapshot(snapshot) { return snapshot.items.map(item => `pam_item(${JSON.stringify(item.id)}, ${JSON.stringify(item.source)}, ${JSON.stringify(item.program)}).`).join("\n") + "\n"; }
function executablePath(command) {
  if (path.isAbsolute(command)) return fs.realpathSync(command);
  for (const entry of (process.env.PATH || "").split(path.delimiter)) {
    const candidate = path.join(entry, command);
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
  }
  throw new Error(`cannot resolve Prolog runtime: ${command}`);
}
function runtimeReadRoots(swipl) {
  const variables = execFileSync(swipl, ["--dump-runtime-variables"], { encoding: "utf8" });
  const base = /^PLBASE="([^"]+)";$/m.exec(variables)?.[1];
  if (!base || !path.isAbsolute(base)) throw new Error("cannot determine SWI-Prolog runtime resources");
  const shared = /^PLLIBSWIPL="([^"]+)";$/m.exec(variables)?.[1];
  const libraries = new Set(), pending = [swipl, ...(shared && path.isAbsolute(shared) ? [shared] : [])];
  while (pending.length) {
    const binary = pending.pop();
    if (libraries.has(binary)) continue;
    libraries.add(binary);
    if (!fs.existsSync(binary)) continue;
    const dependencies = execFileSync("otool", ["-L", binary], { encoding: "utf8" }).split("\n").slice(1)
      .map(line => line.trim().split(" (")[0]).filter(entry => path.isAbsolute(entry));
    for (const dependency of dependencies) {
      if (!libraries.has(dependency)) pending.push(dependency);
    }
  }
  // These are interpreter/runtime resources, not candidate authority.  In
  // particular, do not collapse Homebrew's Cellar/opt paths to /opt/homebrew:
  // that would make every installed package and Homebrew configuration readable.
  // A SWI installation directory and each directly loaded dylib directory are
  // the narrowest reproducible directory grants Seatbelt can express.
  return [...new Set(["/bin/sh", "/private/var/select/sh", swipl, fs.realpathSync(base), "/usr/lib", "/System/Library", "/dev", "/private/var/db/timezone", ...[...libraries].flatMap(file => [path.dirname(file), fs.existsSync(file) ? path.dirname(fs.realpathSync(file)) : file])])];
}
function profile({ inputDir, runtimeRoots }) {
  const literal = value => `(literal ${JSON.stringify(value)})`;
  const subpath = value => `(subpath ${JSON.stringify(value)})`;
  const ancestors = value => {
    const found = []; let current = value;
    while (true) { found.push(literal(current)); const parent = path.dirname(current); if (parent === current) return found; current = parent; }
  };
  return [
    "(version 1)",
    "(deny default)",
    "(allow process*)",
    "(allow file-map-executable)",
    "(allow sysctl-read)",
    "(allow mach-lookup)",
    `(allow file-read-metadata ${runtimeRoots.flatMap(ancestors).join(" ")})`,
    `(allow file-read* ${literal("/")} ${runtimeRoots.map(subpath).join(" ")} ${subpath(path.dirname(inputDir))} ${subpath(inputDir)})`
  ].join(" ");
}
function executeProcess(inputDir, runnerFile, argsAfterRunner, timeoutMs, maxOutputBytes, runtimeRoots, swipl, trustedProtocol) {
  return new Promise((resolve, reject) => {
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new Error("maxOutputBytes must be a positive integer");
    // No candidate receives a writable path. Count stdout and stderr together.
    const args = ["-p", profile({ inputDir: path.dirname(runnerFile), runtimeRoots }), swipl, "--quiet", "--nosignals", "--stack_limit=64m", "-s", runnerFile, "--", ...argsAfterRunner, String(Math.max(1, Math.floor(timeoutMs / 1000)))];
    const child = spawn(SANDBOX, args, { cwd: inputDir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [], stderr = []; let outputBytes = 0, exceeded = false, settled = false;
    const finish = callback => value => { if (!settled) { settled = true; callback(value); } };
    const fail = finish(reject), succeed = finish(resolve);
    const collect = (target, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        exceeded = true;
        child.kill("SIGKILL");
      } else target.push(chunk);
    };
    child.stdout.on("data", chunk => collect(stdout, chunk)); child.stderr.on("data", chunk => collect(stderr, chunk));
    child.on("error", error => fail(new Error(`isolated Prolog run failed: ${error.message}`)));
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, timeoutMs + 500);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const visible = `${Buffer.concat(stderr).toString("utf8")}${Buffer.concat(stdout).toString("utf8")}`.trim();
      if (exceeded) return fail(new Error(`isolated Prolog output exceeded maxOutputBytes (${maxOutputBytes})`));
      // A thought candidate has full Prolog control of its own process, so its
      // bytes and exit status are evidence only, never a result protocol.
      if (!trustedProtocol) return succeed(Object.freeze({ transcript: visible, exitCode: code, signal: signal || null }));
      if (code !== 0) return fail(new Error(`trusted Prolog query failed (exit ${code ?? signal ?? "signal"}): ${visible}`));
      try { succeed(JSON.parse(Buffer.concat(stdout).toString("utf8").trim())); } catch (parseError) { fail(new Error(`isolated Prolog emitted invalid JSON: ${parseError.message}`)); }
    });
  });
}
async function runThought({ snapshot, candidate, goal, timeoutMs = 1500, maxOutputBytes = 256 * 1024 }) {
  if (!snapshot || !candidate) throw new Error("snapshot and candidate are required"); text(goal, "query goal");
  if (process.platform !== "darwin" || !fs.existsSync(SANDBOX)) throw new Error("capability-empty runtime unavailable: macOS sandbox-exec is required");
  const swipl = executablePath(SWIPL), runtimeRoots = runtimeReadRoots(swipl);
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "pam-thought-")));
  const inputDir = path.join(dir, "input");
  fs.mkdirSync(inputDir, { mode: 0o700 });
  const snapshotFile = path.join(inputDir, "snapshot.pl"), candidateFile = path.join(inputDir, "candidate.pl"), runnerFile = path.join(inputDir, "thought-runner.pl");
  try {
    fs.writeFileSync(snapshotFile, serializeSnapshot(snapshot), { mode: 0o444 }); fs.writeFileSync(candidateFile, candidate.program, { mode: 0o444 }); fs.copyFileSync(THOUGHT_RUNNER, runnerFile);
    fs.chmodSync(snapshotFile, 0o444); fs.chmodSync(candidateFile, 0o444); fs.chmodSync(runnerFile, 0o444); fs.chmodSync(inputDir, 0o555);
    const transcript = await executeProcess(inputDir, runnerFile, [snapshotFile, candidateFile, goal], timeoutMs, maxOutputBytes, runtimeRoots, swipl, false);
    return Object.freeze({ candidate: { id: candidate.id, status: "candidate", sha256: candidate.sha256, source: candidate.source }, snapshot: { id: snapshot.id, sha256: snapshot.sha256 }, runEvidence: Object.freeze({ runtime: "swi-prolog-isolated", timeoutMs, maxOutputBytes, transcript, trust: "untrusted" }) });
  } finally { fs.chmodSync(inputDir, 0o700); fs.rmSync(dir, { recursive: true, force: true }); }
}
async function runTrustedQuery({ snapshot, goal, timeoutMs = 1500, maxOutputBytes = 256 * 1024 }) {
  if (!snapshot) throw new Error("snapshot is required"); text(goal, "query goal");
  if (process.platform !== "darwin" || !fs.existsSync(SANDBOX)) throw new Error("capability-empty runtime unavailable: macOS sandbox-exec is required");
  const swipl = executablePath(SWIPL), runtimeRoots = runtimeReadRoots(swipl);
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "pam-query-")));
  const inputDir = path.join(dir, "input");
  fs.mkdirSync(inputDir, { mode: 0o700 });
  const snapshotFile = path.join(inputDir, "snapshot.pl"), runnerFile = path.join(inputDir, "trusted-query-runner.pl");
  try {
    fs.writeFileSync(snapshotFile, serializeSnapshot(snapshot), { mode: 0o444 }); fs.copyFileSync(TRUSTED_QUERY_RUNNER, runnerFile);
    fs.chmodSync(snapshotFile, 0o444); fs.chmodSync(runnerFile, 0o444); fs.chmodSync(inputDir, 0o555);
    const result = await executeProcess(inputDir, runnerFile, [snapshotFile, goal], timeoutMs, maxOutputBytes, runtimeRoots, swipl, true);
    return Object.freeze({ snapshot: { id: snapshot.id, sha256: snapshot.sha256 }, proof: Object.freeze({ runtime: "swi-prolog-trusted-query", timeoutMs, maxOutputBytes, result }) });
  } finally { fs.chmodSync(inputDir, 0o700); fs.rmSync(dir, { recursive: true, force: true }); }
}
function admitCandidate(snapshot, candidate, decision) {
  if (!decision || decision.admit !== true) throw new Error("candidate admission requires an explicit admit decision");
  text(decision.id, "admission decision id"); text(decision.source, "admission decision source");
  return createSnapshot({ id: decision.snapshotId || `${snapshot.id}:${decision.id}`, parentId: snapshot.id, items: [...snapshot.items, { id: candidate.id, program: candidate.program, source: candidate.source, status: "accepted", admittedBy: decision.id }] });
}
function activeItems(snapshot) { const replaced = new Set(snapshot.items.map(item => item.replaces).filter(Boolean)); return snapshot.items.filter(item => !replaced.has(item.id)); }
function overlaps(a, b) { const from = x => x == null ? -Infinity : x, to = x => x == null ? Infinity : x; return from(a.validFrom) <= to(b.validTo) && from(b.validFrom) <= to(a.validTo); }
function directConflicts(snapshot) {
  const active = activeItems(snapshot).filter(item => item.polarity && item.proposition), found = [];
  for (let i = 0; i < active.length; i += 1) for (let j = i + 1; j < active.length; j += 1) { const [left, right] = [active[i], active[j]]; if (left.proposition === right.proposition && left.polarity !== right.polarity && overlaps(left, right)) found.push({ type: "direct-polarity", proposition: left.proposition, left: { id: left.id, source: left.source }, right: { id: right.id, source: right.source } }); }
  return found;
}
module.exports = { createSnapshot, createCandidate, runThought, runTrustedQuery, admitCandidate, activeItems, directConflicts };
