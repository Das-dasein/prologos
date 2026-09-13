"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { handle } = require("./hermes-bridge");
const { classifyOpen } = require("./hermes-live-experiment");
const { IDEAS } = require("./scenario");

function temporaryWorld(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-world-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function request(directory, action, extra = {}) {
  return { directory, action, agent_id: "hermes-test", ideas: IDEAS, ...extra };
}

test("Hermes turns remain sources until a separately admitted proposal", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const recorded = await handle(request(directory, "sync_turn", {
    session_id: "session-one",
    user_content: "The backup is ready.",
    assistant_content: "I will remember that.",
  }));
  assert.equal(recorded.status, "recorded_as_sources_only");
  assert.equal(recorded.snapshot_sha256, (await handle(request(directory, "context"))).snapshot_sha256);
  const events = JSON.parse(fs.readFileSync(path.join(directory, "events.jsonl"), "utf8").trim().split("\n").at(-1));
  assert.equal(events.at, 2, "user and assistant source events advance logical time");
  let recalled = await handle(request(directory, "context"));
  assert.equal(recalled.accepted.length, 0);
  assert.equal(recalled.candidates.length, 0);

  const proposed = await handle(request(directory, "propose", {
    source_text: "Operator says the backup for orion is ready.",
    source_group: "operator_a",
    source_group_attestation: { by: "test_host", reason: "operator identity fixed by synthetic fixture" },
    items: [{ program: "backup_ready(orion)." }],
  }));
  recalled = await handle(request(directory, "context"));
  assert.equal(recalled.accepted.length, 0);
  assert.equal(recalled.candidates[0].id, proposed.proposal_id);
  assert.equal(recalled.candidates[0].source_group, "operator_a");
  assert.equal(recalled.candidates[0].source_group_assurance, "host_attested");

  await handle(request(directory, "admit", {
    proposal_id: proposed.proposal_id,
    by: "test_operator",
    reason: "Explicit test fixture admission.",
  }));
  const result = await handle(request(directory, "query", { query: "backup_ready(orion)." }));
  assert.equal(result.safe_status, "entailed");
  assert.ok(result.safe.some(node => node.source === proposed.source));
  assert.deepEqual(result.safe_support_sets[0].source_group_ids, ["operator_a"]);
  recalled = await handle(request(directory, "context"));
  assert.equal(recalled.accepted[0].source_group, "operator_a");
  assert.equal(recalled.accepted[0].source_group_assurance, "host_attested");
});

test("Hermes dream assumptions are erased and snapshot is unchanged", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const before = await handle(request(directory, "context"));
  const dreamed = await handle(request(directory, "dream", {
    query: "release(orion).",
    assumptions: ["main_down(orion).", "certified_route(orion).", "release(X) :- main_down(X), certified_route(X)."],
  }));
  assert.equal(dreamed.result.safe_status, "entailed");
  assert.equal(dreamed.unchanged, true);
  const after = await handle(request(directory, "context"));
  assert.equal(after.snapshot_sha256, before.snapshot_sha256);
  assert.equal(after.accepted.length, 0);
});

test("session reflection is deduplicated and remains an unaccepted candidate", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const evidence = {
    kind: "hermes_session_reflection_v1",
    input_sha256: "a".repeat(64),
    instructions: "bounded fixture prompt",
    input: "USER SOURCE 1: backup is ready",
    output: '{"items":[{"program":"backup_ready(orion)."}]}',
    provider: "fake",
    model: "fake",
    trust: "untrusted",
  };
  const first = await handle(request(directory, "record_interpretation", {
    source_text: evidence.input,
    items: [{ program: "backup_ready(orion)." }],
    evidence,
  }));
  assert.equal(first.status, "candidate");
  const before = await handle(request(directory, "context"));
  assert.equal(before.accepted.length, 0);
  assert.equal(before.candidates.length, 1);
  assert.equal((await handle(request(directory, "reflection_status", { input_sha256: evidence.input_sha256 }))).status, "recorded");
  const duplicate = await handle(request(directory, "record_interpretation", {
    source_text: evidence.input,
    items: [{ program: "backup_ready(orion)." }],
    evidence,
  }));
  assert.equal(duplicate.status, "duplicate");
  const after = await handle(request(directory, "context"));
  assert.equal(after.journal_head, before.journal_head);
  assert.equal(after.snapshot_sha256, before.snapshot_sha256);
});

test("audited query and dream append receipts without changing knowledge", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const before = await handle(request(directory, "context"));
  const queried = await handle(request(directory, "query", { query: "release(orion).", audit: true }));
  assert.equal(queried.journal_event, "e2");
  assert.equal(queried.snapshot_unchanged, true);
  const dreamed = await handle(request(directory, "dream", {
    query: "backup_ready(orion).", assumptions: ["backup_ready(orion)."], audit: true,
  }));
  assert.equal(dreamed.journal_event, "e3");
  assert.equal(dreamed.unchanged, true);
  const after = await handle(request(directory, "context"));
  assert.equal(after.snapshot_sha256, before.snapshot_sha256);
  assert.notEqual(after.journal_head, before.journal_head);
  const events = fs.readFileSync(path.join(directory, "events.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(events.slice(1).map(event => event.payload.kind), ["hermes_memory_query", "hermes_memory_dream"]);
});

test("declared goals receive a host policy decision without an external action", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const source = await handle(request(directory, "propose", {
    source_text: "В synthetic episode основной сервис недоступен, а независимый маршрут подтверждён.",
    items: [
      { program: "main_down(orion)." },
      { program: "certified_route(orion)." },
      { program: "release(X) :- main_down(X), certified_route(X)." },
    ],
  }));
  await handle(request(directory, "admit", { proposal_id: source.proposal_id, by: "test_operator", reason: "Explicit synthetic fixture admission." }));
  const goal = {
    id: "host_policy_goal", text: "Проверить выпуск orion.", query: "release(orion)", action: "request_release_orion",
    questions: [{ id: "backup", text: "Готов ли резерв?", literal: "backup_ready(orion)", cost: 1 }],
  };
  const first = await handle(request(directory, "decide", { goal }));
  assert.equal(first.status, "host_policy_decision");
  assert.equal(first.authority, "WorldAgent signed-horn safe policy v0");
  assert.equal(first.external_action, "not_executed");
  assert.equal(first.decision.kind, "act");
  assert.equal(first.decision.mode, "simulated_action_request");
  assert.ok(first.decision.proof.some(node => node.literal === "certified_route(orion)"));
  const repeat = await handle(request(directory, "decide"));
  assert.equal(repeat.decision.kind, "await_outcome", "the bridge cannot silently repeat the action");
});

test("host policy bridge preserves ask and conflict pause decisions", async t => {
  const askDirectory = temporaryWorld(t);
  await handle(request(askDirectory, "init"));
  const rule = await handle(request(askDirectory, "propose", {
    source_text: "Synthetic rule: a ready backup is sufficient for release.",
    items: [{ program: "release(X) :- backup_ready(X)." }],
  }));
  await handle(request(askDirectory, "admit", { proposal_id: rule.proposal_id, by: "test_operator", reason: "Explicit offline fixture admission." }));
  const ask = await handle(request(askDirectory, "decide", {
    goal: {
      id: "ask_goal", text: "Check release.", query: "release(orion)", action: "request_release_orion",
      questions: [{ id: "backup", text: "Is the backup ready?", literal: "backup_ready(orion)", cost: 1 }],
    },
  }));
  assert.equal(ask.decision.kind, "ask");
  assert.equal(ask.decision.question.id, "backup");
  assert.equal(ask.external_action, "not_executed");

  const conflictDirectory = temporaryWorld(t);
  await handle(request(conflictDirectory, "init"));
  const conflictSource = await handle(request(conflictDirectory, "propose", {
    source_text: "Synthetic unresolved opposing statements.",
    items: [{ program: "release(orion)." }, { program: "neg(release(orion))." }],
  }));
  await handle(request(conflictDirectory, "admit", { proposal_id: conflictSource.proposal_id, by: "test_operator", reason: "Explicit offline fixture admission." }));
  const pause = await handle(request(conflictDirectory, "decide", {
    goal: { id: "conflict_goal", text: "Check release.", query: "release(orion)", action: "request_release_orion" },
  }));
  assert.equal(pause.decision.kind, "pause");
  assert.equal(pause.decision.reason, "goal_conflicted");
  assert.equal(pause.external_action, "not_executed");
});

test("Hermes host policy can require independent fact-source support", async t => {
  const directory = temporaryWorld(t);
  await handle(request(directory, "init"));
  const source = await handle(request(directory, "propose", {
    source_text: "One operator reports that release is ready.", source_group: "operator_a",
    items: [{ program: "release(orion)." }],
  }));
  await handle(request(directory, "admit", { proposal_id: source.proposal_id, by: "test_operator", reason: "Explicit offline fixture admission." }));
  const result = await handle(request(directory, "decide", {
    goal: {
      id: "independent_support_goal", text: "Check release.", query: "release(orion)", action: "request_release_orion",
      actionPolicy: { minIndependentFactSupportPaths: 2 },
    },
  }));
  assert.equal(result.authority, "WorldAgent signed-horn safe policy v0 + independent-fact-support-v1");
  assert.equal(result.decision.kind, "pause");
  assert.equal(result.decision.reason, "insufficient_independent_fact_support");
  assert.equal(result.decision.provenance_policy.eligible_support_path_count, 1);
});

test("open-run classifier distinguishes an evidence request from release", () => {
  assert.equal(classifyOpen("Нужно уточнить, готов ли резерв, потому что данных пока нет."), "ask_for_backup_evidence");
  assert.equal(classifyOpen("Выпуск разрешён через подтверждённый независимый маршрут; можно выпускать."), "proceed_with_release");
  assert.equal(classifyOpen("Следующий шаг: разрешить выпуск Orion через независимый маршрут."), "proceed_with_release");
  assert.equal(classifyOpen("Следует подумать дальше."), "other");
});
