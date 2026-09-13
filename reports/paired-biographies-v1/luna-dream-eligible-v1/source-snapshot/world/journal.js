"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { hash, clone, registry, program } = require("./checker");
const TYPES = new Set(["created", "source", "proposal", "admission", "goal", "reflection_started", "reflection", "decision", "reply", "action_result", "thought", "interpretation", "resume"]);
function nonempty(x, name) { if (typeof x !== "string" || !x.trim()) throw new Error(`${name} required`); }
function sourceGroup(x, name = "source group") { if (typeof x !== "string" || !x.trim() || x.length > 256) throw new Error(`${name} must be a bounded nonempty string`); return x; }
function tick(x) { if (!Number.isSafeInteger(x) || x < 0) throw new Error("time must be a nonnegative integer tick"); return x; }

class Journal {
  constructor(directory, config) {
    this.directory = path.resolve(directory); this.file = path.join(this.directory, "events.jsonl");
    this.lock = path.join(this.directory, ".write-lock");
    fs.mkdirSync(this.directory, { recursive: true });
    if (!fs.existsSync(this.file)) {
      if (!config) throw new Error("new agent requires config");
      registry(config.ideas); nonempty(config.agent_id, "agent identity");
      this.append("created", clone(config), tick(config.startTime ?? 0), null);
    }
    this.read();
  }
  read() {
    if (!fs.existsSync(this.file)) return [];
    const stat = fs.statSync(this.file);
    if (stat.size > 32 * 1024 * 1024) throw new Error("PoC journal size limit reached");
    const data = fs.readFileSync(this.file, "utf8");
    if (!data.endsWith("\n")) throw new Error("incomplete journal record; restore from verified backup");
    const events = data.trimEnd().split("\n").map(line => JSON.parse(line));
    let previous = null, time = 0;
    events.forEach((event, index) => {
      const { sha256, ...body } = event;
      if (body.seq !== index + 1 || body.id !== `e${index + 1}` || body.previous !== previous || hash(body) !== sha256 || !TYPES.has(body.type)) throw new Error("journal integrity failure");
      if (tick(body.at) < time) throw new Error("journal time moved backwards");
      if ((index === 0) !== (body.type === "created")) throw new Error("invalid creation record");
      previous = sha256; time = body.at;
    });
    return events;
  }
  append(type, payload, at, expectedHead) {
    if (!TYPES.has(type)) throw new Error("unknown journal event");
    try { fs.mkdirSync(this.lock); } catch { throw new Error("agent journal is being written; retry after writer exits"); }
    try {
      const events = this.read(), last = events.at(-1);
      if (expectedHead !== undefined && (last?.sha256 ?? null) !== expectedHead) throw new Error("stale agent state; reload before applying result");
      tick(at); if (at < (last?.at ?? 0)) throw new Error("event time moved backwards");
      if ((events.length === 0) !== (type === "created")) throw new Error("invalid creation event");
      const body = { seq: events.length + 1, id: `e${events.length + 1}`, previous: last?.sha256 ?? null, at, type, payload: clone(payload) };
      const record = { ...body, sha256: hash(body) };
      const line = `${JSON.stringify(record)}\n`;
      if (Buffer.byteLength(line) + (fs.existsSync(this.file) ? fs.statSync(this.file).size : 0) > 32 * 1024 * 1024) throw new Error("PoC journal size limit reached before write");
      const fd = fs.openSync(this.file, "a", 0o600);
      try { fs.writeFileSync(fd, line); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      return record;
    } finally { fs.rmdirSync(this.lock); }
  }
  state() {
    const events = this.read(); const config = events[0].payload;
    const proposals = {}, items = [], sources = {}, goals = [];
    let goal = null;
    for (const e of events) {
      const p = e.payload;
      if (e.type === "source") sources[e.id] = { ...p, at: e.at };
      if (e.type === "proposal") proposals[p.id] = { ...p, status: "candidate" };
      if (e.type === "admission") {
        const proposal = proposals[p.proposalId];
        if (!proposal || proposal.status !== "candidate") throw new Error("invalid or repeated admission in journal");
        proposal.status = "accepted"; proposal.decision = p.decision;
        items.push(...proposal.items.map(item => ({ ...item, status: "accepted", admittedAt: e.at, admission: e.id })));
      }
      if (e.type === "goal") { goal = { ...p, status: "active", spent: { queries: 0, branches: 0, questions: 0 }, decision: null, pending: null }; goals.push(goal); }
      if (e.type === "reflection_started" && goal) { for (const key of ["queries", "branches"]) goal.spent[key] += p.reserved[key]; goal.inFlight = p; }
      if (e.type === "reflection" && goal) { for (const key of ["queries", "branches"]) goal.spent[key] += p.cost[key] - goal.inFlight.reserved[key]; goal.inFlight = null; goal.reflection = p; }
      if (e.type === "decision" && goal) {
        goal.decision = { ...p, eventId: e.id }; goal.status = p.kind === "ask" ? "waiting" : p.kind === "act" ? "awaiting_outcome" : "paused";
        if (p.kind === "ask") { goal.spent.questions += 1; goal.pending = p.question; }
      }
      if (e.type === "reply" && goal) {
        goal.status = p.answer === "unknown" ? "paused" : "active";
        if (p.answer !== "unknown") goal.pending = null;
        if (p.answer === "unknown") goal.decision = { kind: "pause", reason: "participant_does_not_know", eventId: e.id };
      }
      if (e.type === "resume" && goal) { goal.status = "active"; goal.inFlight = null; }
      if (e.type === "action_result" && goal) { goal.status = p.outcome === "success" ? "completed" : "failed"; goal.outcome = { ...p, eventId: e.id }; }
    }
    return { agent_id: config.agent_id, ideas: config.ideas, journal_head: events.at(-1).sha256, now: events.at(-1).at, events, sources, proposals, items, goals, goal };
  }
  snapshot(at = this.state().now) { return projectSnapshot(this.state(), at); }
}

function projectSnapshot(state, at) {
  tick(at);
  const observed = state.items.filter(x => x.admittedAt <= at && x.observedAt <= at);
  const replaced = new Set(observed.filter(x => x.validFrom <= at).map(x => x.replaces).filter(Boolean));
  const items = observed.filter(x => x.modality === "asserted" && x.validFrom <= at && (x.validTo === null || x.validTo >= at) && !replaced.has(x.id));
  const body = { profile: "signed-horn-v0", ideas: clone(state.ideas), at, items: clone(items) };
  return { ...body, sha256: hash(body) };
}

function prepareItems(input, source, state) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) throw new Error("proposal needs 1..100 items");
  const existing = new Set(Object.values(state.proposals).flatMap(p => p.items.map(i => i.id)));
  return input.map((x, index) => {
    const id = x.id ?? `item_${state.events.length + 1}_${index + 1}`;
    if (!/^[a-z][a-z0-9_]*$/.test(id) || existing.has(id)) throw new Error("invalid or reused item identity");
    existing.add(id);
    const validFrom = tick(x.validFrom ?? state.sources[source].at), validTo = x.validTo ?? null;
    if (validTo !== null && tick(validTo) < validFrom) throw new Error("invalid validity interval");
    if (x.replaces && !state.items.some(i => i.id === x.replaces)) throw new Error("revision target must already be admitted");
    const modality = x.modality ?? "asserted";
    if (!["asserted", "reported", "uncertain"].includes(modality)) throw new Error("invalid modality");
    if (x.replaces && modality !== "asserted") throw new Error("an uncertain or reported item cannot supersede asserted knowledge");
    return { id, program: program(x.program), source, source_group: sourceGroup(x.source_group ?? state.sources[source].source_group ?? source), observedAt: state.sources[source].at, validFrom, validTo, modality, replaces: x.replaces ?? null, origin: x.origin ? clone(x.origin) : null };
  });
}
module.exports = { Journal, projectSnapshot, prepareItems, nonempty, sourceGroup, tick };
