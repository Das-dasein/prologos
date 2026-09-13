"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent, supportSetsFor, supportDetailsFor, compareSupportSets } = require("./agent");
const { check } = require("./checker");
const { seed, IDEAS, GOAL } = require("./scenario");
const { fromAssertions, fromCognitive } = require("./import");
const { interpret } = require("./interpreter");
const { execFileSync } = require("node:child_process");
function temp(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-world-test-")); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
function fixture(programs, signatures = IDEAS.predicates) {
  return { ideas: { ...IDEAS, predicates: signatures }, items: programs.map((program, i) => ({ id: `a${i}`, source: `event${i}`, program })) };
}
async function add(agent, program, opts = {}) {
  const source = agent.observe(opts.text || program, { at: opts.at ?? agent.state().now });
  const id = agent.propose(source, [{ program, ...opts }]);
  await agent.admit(id, { admit: true, by: "test_operator", reason: "explicit fixture input" }); return agent.state().proposals[id].items[0].id;
}
test("old memory changes next action; signed dreams preserve knowledge; answer survives reload", async t => {
  const dir = temp(t), h1 = await seed(path.join(dir, "one")), h2 = await seed(path.join(dir, "two"), { independent: true });
  const before = h1.snapshot();
  const a = await h1.step({ strategy: "dream" }), b = await h2.step({ strategy: "dream" });
  assert.equal(a.kind, "ask"); assert.equal(a.question.literal, "backup_ready(orion)"); assert.equal(b.kind, "act");
  assert.equal(h1.snapshot().sha256, before.sha256);
  for (const [agent, expectedBranches] of [[h1, 2], [h2, 0]]) {
    const receipt = agent.state().goal.reflection;
    assert.equal(receipt.questions.length, expectedBranches ? 1 : 0);
    if (expectedBranches) {
      assert.equal(receipt.questions[0].branches.length, expectedBranches);
      assert.ok(receipt.questions[0].branches[0].result.safe.some(n => n.item_id === "old_release_rule"));
    }
    assert.equal(receipt.snapshot_after, receipt.snapshot.sha256);
    assert.equal(agent.state().items.some(i => i.source.startsWith("conditional:")), false);
  }
  const count = h1.state().events.length;
  assert.equal((await new WorldAgent(h1.journal.directory).step()).kind, "ask");
  assert.equal(h1.state().events.length, count, "waiting does not repeat question or charge budget");
  await new WorldAgent(h1.journal.directory).answer("yes", { at: 101 });
  const restored = new WorldAgent(h1.journal.directory), next = await restored.step();
  assert.equal(next.kind, "act"); assert.ok(next.proof.some(n => n.literal === "backup_ready(orion)"));
  assert.equal(restored.state().goal.status, "awaiting_outcome");
  assert.equal((await new WorldAgent(restored.journal.directory).step()).kind, "await_outcome");
  restored.outcome("success", "Симулятор сообщил об успешном выпуске.", { at: 102 });
  assert.equal(new WorldAgent(restored.journal.directory).state().goal.status, "completed");
  assert.equal((await new WorldAgent(restored.journal.directory).step()).kind, "done");
  await restored.startGoal({ ...GOAL, id: "later_recall" });
  assert.equal((await restored.step({ strategy: "missing" })).kind, "act");
});
test("semantic interventions: names irrelevant, deleting rule changes choice, unrelated memory does not", async t => {
  const dir = temp(t);
  const renamed = await seed(path.join(dir, "renamed"), { agentId: "H2", ruleId: "unexpected_name" });
  const deleted = await seed(path.join(dir, "deleted"), { omitRule: true });
  const extra = await seed(path.join(dir, "extra"), { extraHistory: true });
  assert.equal((await renamed.step({ strategy: "dream" })).kind, "ask");
  assert.equal((await deleted.step({ strategy: "dream" })).kind, "pause");
  assert.equal((await extra.step({ strategy: "dream" })).kind, "ask");
  const oppositeName = await seed(path.join(dir, "opposite"), { agentId: "H1", independent: true, ruleId: "another_name" });
  assert.equal((await oppositeName.step({ strategy: "dream" })).kind, "act");
});
test("missing-premise control produces the same choices with fewer executions", async t => {
  const dir = temp(t);
  for (const independent of [false, true]) {
    const direct = await seed(path.join(dir, `direct-${independent}`), { independent });
    const dream = await seed(path.join(dir, `dream-${independent}`), { independent });
    assert.equal((await direct.step({ strategy: "missing" })).kind, (await dream.step({ strategy: "dream" })).kind);
    assert.equal(direct.state().goal.spent.queries, 1); assert.equal(dream.state().goal.spent.queries, independent ? 1 : 3);
  }
});
test("dream acts on an entailed baseline within a one-query budget", async t => {
  const agent = await seed(path.join(temp(t), "entailed"), { independent: true, budget: { queries: 1, branches: 0 } });
  const decision = await agent.step({ strategy: "dream" });
  assert.equal(decision.kind, "act");
  assert.deepEqual(agent.state().goal.spent, { queries: 1, branches: 0, questions: 0 });
  assert.deepEqual(agent.state().goal.reflection.questions, []);
});
test("dream preserves an ordinary sequential question when no single branch can immediately act", async t => {
  const build = async name => {
    const agent = new WorldAgent(path.join(temp(t), name), { agent_id: name, ideas: { version: "sequential-dream-v0", predicates: [{ name: "release", arity: 1 }, { name: "p", arity: 1 }, { name: "q", arity: 1 }] }, startTime: 0 });
    await add(agent, "release(X) :- p(X), q(X).");
    await agent.startGoal({ id: "sequential", text: "Check release.", query: "release(orion)", action: "request_release", questions: [{ id: "p", text: "p?", literal: "p(orion)", cost: 1 }, { id: "q", text: "q?", literal: "q(orion)", cost: 1 }] });
    return agent;
  };
  const missing = await build("missing"), dream = await build("dream");
  assert.equal((await missing.step({ strategy: "missing" })).question.id, "p");
  const decision = await dream.step({ strategy: "dream" });
  assert.equal(decision.kind, "ask"); assert.equal(decision.question.id, "p"); assert.equal(decision.reason, "missing_premise");
  assert.deepEqual(dream.state().goal.reflection.questions.map(q => q.disposition), ["irrelevant_to_this_goal", "irrelevant_to_this_goal"]);
});
test("direct conflict blocks its dependencies while an independent path remains usable", async () => {
  const programs = ["backup_ready(orion).", "neg(backup_ready(orion)).", "release(X) :- backup_ready(X)."];
  const blocked = await check({ snapshot: fixture(programs), query: "release(orion)" });
  assert.equal(blocked.raw_status, "entailed"); assert.equal(blocked.safe_status, "unknown");
  assert.equal(blocked.conflicts.length, 2);
  const independent = await check({ snapshot: fixture([...programs, "certified_route(orion).", "release(X) :- certified_route(X)."]), query: "release(orion)" });
  assert.equal(independent.safe_status, "entailed");
  assert.equal(independent.safe.find(n => n.literal === "release(orion)").item_id, "a4");
  assert.equal(independent.safe.some(n => n.literal === "backup_ready(orion)"), false);
  assert.deepEqual(supportSetsFor(independent, "release(orion)", "raw"), [["a0", "a2"], ["a3", "a4"]]);
  assert.deepEqual(supportSetsFor(independent, "release(orion)"), [["a3", "a4"]]);
});
test("support sets retain alternative roots and do not manufacture independence from a derived assertion", async () => {
  const derived = await check({ snapshot: fixture([
    "p(orion).", "neg(p(orion)).", "q(X) :- p(X).", "r(X) :- q(X)."
  ], [{ name: "p", arity: 1 }, { name: "q", arity: 1 }, { name: "r", arity: 1 }]), query: "r(orion)" });
  assert.deepEqual(supportSetsFor(derived, "r(orion)", "raw"), [["a0", "a2", "a3"]]);
  assert.deepEqual(supportSetsFor(derived, "r(orion)"), []);
  const observed = await check({ snapshot: fixture([
    "p(orion).", "neg(p(orion)).", "q(X) :- p(X).", "r(X) :- q(X).", "q(orion)."
  ], [{ name: "p", arity: 1 }, { name: "q", arity: 1 }, { name: "r", arity: 1 }]), query: "r(orion)" });
  assert.deepEqual(supportSetsFor(observed, "r(orion)"), [["a3", "a4"]]);
  assert.ok(observed.safe_support_sets.every(set => Array.isArray(set.item_ids) && set.item_ids.length));
});
test("alternative event sources disclose a shared declared source group without claiming independence", async () => {
  const snapshot = {
    ideas: { version: "shared-source-test-v0", predicates: [{ name: "release", arity: 1 }] },
    items: [
      { id: "a", source: "event_one", source_group: "same_message", program: "release(orion)." },
      { id: "b", source: "event_two", source_group: "same_message", program: "release(orion)." },
    ],
  };
  const result = await check({ snapshot, query: "release(orion)" });
  assert.deepEqual(supportSetsFor(result, "release(orion)", "raw"), [["a"], ["b"]]);
  assert.deepEqual(supportDetailsFor(result, "release(orion)", "raw"), [
    { item_ids: ["a"], source_ids: ["event_one"], fact_source_ids: ["event_one"], rule_source_ids: [], source_group_ids: ["same_message"], fact_source_group_ids: ["same_message"], rule_source_group_ids: [] },
    { item_ids: ["b"], source_ids: ["event_two"], fact_source_ids: ["event_two"], rule_source_ids: [], source_group_ids: ["same_message"], fact_source_group_ids: ["same_message"], rule_source_group_ids: [] },
  ]);
  const compared = compareSupportSets(result, "release(orion)", "raw");
  assert.deepEqual(compared.comparisons[0].item_overlap, []);
  assert.deepEqual(compared.comparisons[0].fact_source_overlap, []);
  assert.deepEqual(compared.comparisons[0].fact_source_group_overlap, ["same_message"]);
  assert.equal(compared.comparisons[0].item_disjoint, true);
  assert.equal(compared.comparisons[0].fact_source_disjoint, true);
  assert.equal(compared.comparisons[0].fact_source_group_disjoint, false);
});
test("declared source group survives the journal, admission, and checker receipt", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "source-group", ideas: IDEAS, startTime: 0 });
  const source = agent.observe("Operator A reports that the backup is ready.", { sourceGroup: "operator_a" });
  const proposal = agent.propose(source, [{ program: "backup_ready(orion)." }]);
  await agent.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  const accepted = agent.snapshot().items[0];
  assert.equal(accepted.source_group, "operator_a");
  const result = await check({ snapshot: agent.snapshot(), query: "backup_ready(orion)" });
  assert.deepEqual(result.safe_support_sets[0].source_group_ids, ["operator_a"]);
});
test("checker rejects malformed declared provenance groups", () => {
  assert.throws(
    () => check({ snapshot: { ideas: IDEAS, items: [{ id: "a", source: "event_one", source_group: 7, program: "backup_ready(orion)." }] }, query: "backup_ready(orion)" }),
    /source group must be a bounded nonempty string/
  );
});
test("support comparison separates shared rules from distinct fact origins", async () => {
  const snapshot = {
    ideas: { version: "support-comparison-test-v0", predicates: [{ name: "p", arity: 1 }, { name: "q", arity: 1 }, { name: "release", arity: 1 }] },
    items: [
      { id: "p_fact", source: "observation_a", program: "p(orion)." },
      { id: "q_fact", source: "observation_b", program: "q(orion)." },
      { id: "p_rule", source: "shared_policy", program: "release(X) :- p(X)." },
      { id: "q_rule", source: "shared_policy", program: "release(X) :- q(X)." },
    ],
  };
  const result = await check({ snapshot, query: "release(orion)" });
  const compared = compareSupportSets(result, "release(orion)", "raw");
  assert.equal(compared.comparisons.length, 1);
  const [comparison] = compared.comparisons;
  assert.equal(comparison.item_disjoint, true);
  assert.equal(comparison.fact_source_disjoint, true);
  assert.equal(comparison.rule_source_disjoint, false);
  assert.deepEqual(comparison.rule_source_overlap, ["shared_policy"]);
});
test("support-set exhaustion is explicit and cannot silently discard an alternative proof", async () => {
  const result = await check({
    snapshot: fixture(["p(orion).", "q(orion).", "release(X) :- p(X).", "release(X) :- q(X)."], [
      { name: "p", arity: 1 }, { name: "q", arity: 1 }, { name: "release", arity: 1 }
    ]),
    query: "release(orion)",
    // p and q consume two sets; the second release support crosses this limit.
    maxProofSupportSets: 3
  });
  assert.equal(result.status, "resource_exhausted");
  assert.equal(result.reason, "proof_support_sets");
});
test("derived opposing conclusions conflict without explosion or false negation", async () => {
  const result = await check({ snapshot: fixture(["backup_ready(orion).", "certified_route(orion).", "release(X) :- backup_ready(X).", "neg(release(X)) :- certified_route(X)."]), query: "release(orion)" });
  assert.equal(result.raw_status, "conflict"); assert.equal(result.safe_status, "unknown");
  assert.ok(result.raw.some(n => n.literal === "neg(release(orion))"));
  const absent = await check({ snapshot: fixture([]), query: "release(orion)" });
  assert.equal(absent.raw_status, "unknown"); assert.equal(absent.safe_status, "unknown");
});
test("as-of projection respects admission, time, independent negative assertions and supersession", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "history", ideas: IDEAS, startTime: 0 });
  const old = await add(agent, "backup_ready(orion).", { id: "old", at: 1 });
  await add(agent, "neg(backup_ready(orion)).", { id: "new", replaces: old, validFrom: 5, validTo: 6, at: 2 });
  await add(agent, "note(future).", { validFrom: 10, at: 3 });
  await add(agent, "note(uncertain).", { modality: "uncertain", at: 4 });
  assert.deepEqual(agent.snapshot(1).items.map(x => x.id), ["old"]);
  assert.equal(agent.snapshot(4).items.some(x => x.id === "old"), true);
  assert.equal(agent.snapshot(5).items.some(x => x.id === "old"), false);
  assert.equal((await check({ snapshot: agent.snapshot(5), query: "backup_ready(orion)" })).safe_status, "contradicted");
  assert.equal(agent.snapshot(7).items.length, 0, "expired revision does not resurrect superseded assertion");
  assert.equal(agent.snapshot(10).items.length, 1);
});
test("unsupported terms and forged output never execute; resource exhaustion is explicit", async () => {
  for (const program of [":- initialization(halt).", "release(X).", "release(X) :- call(X).", "release(orion). backup_ready(orion).", "release(X) :- main_down(Y).", "release(f(orion))."]) {
    const r = await check({ snapshot: fixture([program]), query: "release(orion)" });
    assert.equal(r.status, "unsupported", program);
  }
  const r = await check({ snapshot: fixture(["main_down(orion)."]), query: "release(orion)", inferences: 1 });
  assert.equal(r.status, "resource_exhausted");
});
test("budget and unknown/negative answers stop without inventing readiness", async t => {
  const dir = temp(t), no = await seed(path.join(dir, "no")), unknown = await seed(path.join(dir, "unknown"));
  await no.step(); await no.answer("no", { at: 101 });
  assert.equal((await no.step()).kind, "pause");
  assert.ok(no.snapshot().items.some(i => i.program === "neg(backup_ready(orion))."));
  await unknown.step(); const hashBefore = unknown.snapshot().sha256;
  await unknown.answer("unknown"); assert.equal(unknown.snapshot().sha256, hashBefore);
  const events = unknown.state().events.length;
  await unknown.step(); assert.equal(unknown.state().events.length, events);
  const empty = new WorldAgent(path.join(dir, "budget"), { agent_id: "budget", ideas: IDEAS, startTime: 0 });
  await empty.startGoal({ ...GOAL, budget: { queries: 0, branches: 0 } });
  assert.equal((await empty.step()).reason, "budget_exhausted"); assert.equal(empty.state().goal.spent.queries, 0);
});
test("proposal admission is explicit; journal detects edits and survives a second reader", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "integrity", ideas: IDEAS, startTime: 0 });
  const source = agent.observe("ready"), proposal = agent.propose(source, [{ program: "backup_ready(orion)." }]);
  await assert.rejects(agent.admit(proposal, { admit: false }), /explicit/);
  assert.equal(agent.snapshot().items.length, 0);
  await agent.admit(proposal, { admit: true, by: "operator", reason: "explicit statement" });
  await assert.rejects(agent.admit(proposal, { admit: true, by: "operator", reason: "again" }), /already/);
  assert.equal(new WorldAgent(agent.journal.directory).snapshot().items.length, 1);
  const lines = fs.readFileSync(agent.journal.file, "utf8").replace('"ready"', '"changed"');
  fs.writeFileSync(agent.journal.file, lines);
  assert.throws(() => new WorldAgent(agent.journal.directory), /integrity/);
});
test("existing assertion and cognitive memories import through explicit proposals with polarity and provenance", async t => {
  const dir = temp(t), agent = new WorldAgent(path.join(dir, "assertions"), { agent_id: "import", ideas: IDEAS, startTime: 0 });
  const envelope = `assertion(old, backup_ready(orion)).
assertion_status(old, accepted).
assertion_polarity(old, positive).
assertion_modality(old, asserted).
assertion_time(old, interval(1, inf)).
assertion_source(old, user_message(m1)).
assertion(new, backup_ready(orion)).
assertion_status(new, accepted).
assertion_polarity(new, negative).
assertion_modality(new, asserted).
assertion_time(new, interval(1, inf)).
assertion_source(new, user_message(m2)).
assertion_revision(new, replaces, old).
`;
  const imported = await fromAssertions(agent, envelope, { at: 10 });
  assert.deepEqual(imported.skipped, ["old"]); assert.equal(agent.snapshot().items.length, 0);
  await agent.admit(imported.proposalId, { admit: true, by: "operator", reason: "reviewed import" });
  assert.equal((await check({ snapshot: agent.snapshot(), query: "backup_ready(orion)" })).safe_status, "contradicted");
  assert.equal(agent.snapshot().items[0].origin.source, "user_message(m2)");
  assert.equal(agent.state().sources[agent.snapshot().items[0].source].text, envelope);
  await assert.rejects(fromAssertions(agent, ":- initialization(halt)."), /refused/);
  const cognitive = new WorldAgent(path.join(dir, "cognitive"), { agent_id: "import2", ideas: IDEAS, startTime: 0 });
  const result = fromCognitive(cognitive, { id: "s0", items: [{ id: "a", program: "backup_ready(orion)", proposition: "backup_ready(orion)", polarity: "negative", source: "turn(4)", status: "accepted" }] });
  await cognitive.admit(result.proposalId, { admit: true, by: "operator", reason: "reviewed import" });
  assert.equal((await check({ snapshot: cognitive.snapshot(), query: "backup_ready(orion)" })).safe_status, "contradicted");
});
test("LLM interpretation is a quarantined proposal with a complete prompt/output trace", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "interpreter", ideas: IDEAS, startTime: 0 });
  const generated = JSON.stringify({ items: [{ program: "backup_ready(orion)." }], explanation: "Fixture response for boundary testing; not an extraction evaluation." });
  const result = await interpret(agent, "Резерв orion готов.", { provider: "test-double", generate: async () => generated });
  assert.equal(agent.snapshot().items.length, 0); assert.equal(agent.state().proposals[result.proposalId].status, "candidate");
  assert.equal(agent.state().events.find(e => e.type === "interpretation").payload.evidence.output, generated);
  const empty = await interpret(agent, "Не уверен.", { provider: "test-double", generate: async () => JSON.stringify({ items: [], explanation: "uncertain" }) });
  assert.equal(empty.status, "needs_clarification");
});
test("actual CLI processes continue the same saved episode", async t => {
  const dir = path.join(temp(t), "cli"); const cli = path.join(__dirname, "cli.js");
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" }));
  run("init", dir, "H1");
  assert.equal(run("step", dir).kind, "ask");
  assert.equal(run("answer", dir, "yes").kind, "act");
  run("outcome", dir, "success", "Симулятор подтвердил выпуск.");
  assert.equal(run("state", dir).goal.status, "completed");
});
test("interrupted reflection keeps its reserved budget; explicit resume cannot reset it", async t => {
  const agent = await seed(temp(t));
  agent.journal.append("reflection_started", { strategy: "dream", snapshot: agent.snapshot().sha256, reserved: { queries: 3, branches: 2 } }, agent.state().now);
  await assert.rejects(agent.step(), /interrupted reflection/);
  const before = agent.state().goal.spent;
  new WorldAgent(agent.journal.directory).resume("Operator inspected the interrupted local run.");
  assert.deepEqual(agent.state().goal.spent, before);
  assert.equal((await agent.step()).kind, "ask");
});
test("full-Prolog thought runs independently and forged transcript cannot become trusted memory", { skip: process.platform !== "darwin" ? "full-Prolog thought requires macOS Seatbelt; deterministic world checker remains portable" : false }, async t => {
  const agent = await seed(temp(t));
  const source = agent.observe("Execute an isolated exploratory program."), before = agent.snapshot().sha256;
  const record = await agent.think(source, "explore :- findall(X, certified_route(X), Xs), length(Xs,N), format('routes=~d~n',[N]).", "explore");
  assert.equal(record.payload.evidence.runEvidence.trust, "untrusted");
  assert.match(record.payload.evidence.runEvidence.transcript.transcript, /routes=1/);
  const forged = await agent.think(source, ":- initialization((write('forged proof: release(orion)'), nl, halt)).", "true");
  assert.match(forged.payload.evidence.runEvidence.transcript.transcript, /forged proof/);
  assert.equal(agent.snapshot().sha256, before);
  const fork = await agent.think(source, ":- use_module(library(process)).\ntry_child :- process_create('/bin/sh', ['-c', 'true'], [process(P)]), process_wait(P, _).", "try_child");
  assert.equal(fork.payload.evidence.runEvidence.forbidSubprocesses, true);
  assert.match(fork.payload.evidence.runEvidence.transcript.transcript, /permission|error|operation/i);
  assert.equal((await agent.step()).kind, "ask", "forged thought proof did not license release");
});
test("multi-hop relational closure terminates on cycles and preserves rule provenance", async () => {
  const snapshot = fixture(["link(a,b).", "link(b,c).", "link(c,a).", "reach(X,Y) :- link(X,Y).", "reach(X,Z) :- reach(X,Y), link(Y,Z)."], [{ name: "link", arity: 2 }, { name: "reach", arity: 2 }]);
  const result = await check({ snapshot, query: "reach(a,c)" });
  assert.equal(result.safe_status, "entailed");
  assert.equal(result.safe.find(n => n.literal === "reach(a,c)").item_id, "a4");
  assert.ok(result.safe.length <= 12);
});
test("checker failure cannot be hidden by the action policy", async t => {
  const agent = await seed(temp(t), { independent: true });
  assert.equal((await agent.step({ limits: { inferences: 1 } })).reason, "incomplete_check");
  assert.notEqual(agent.state().goal.status, "awaiting_outcome");
  await assert.rejects(agent.step({ limits: { assumptions: [{ program: "release(orion)." }] } }), /only resource/);
});
test("question cost and persistent question budget determine whether asking is permitted", async t => {
  const dir = temp(t);
  for (const [name, budget, reason] of [["cost", { maxQuestionCost: 0 }, "no_supported_next_action"], ["count", { questions: 0 }, "question_budget_exhausted"]]) {
    const agent = new WorldAgent(path.join(dir, name), { agent_id: name, ideas: IDEAS, startTime: 0 });
    await add(agent, "release(X) :- main_down(X), backup_ready(X).");
    await add(agent, "main_down(orion).");
    await agent.startGoal({ ...GOAL, budget });
    assert.equal((await agent.step()).reason, reason);
    assert.equal(agent.state().goal.spent.questions, 0);
  }
});
