"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { check, clone } = require("./checker");
const { normalizeActionPolicy } = require("./provenance-policy");

const MAX_REQUEST_BYTES = 1024 * 1024;

function requiredString(value, name, max = 32768) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} required`);
  if (value.length > max) throw new Error(`${name} too large`);
  return value;
}

function open(request) {
  const directory = path.resolve(requiredString(request.directory, "directory", 4096));
  if (!fs.existsSync(path.join(directory, "events.jsonl"))) {
    const ideas = request.ideas;
    if (!ideas) throw new Error("new Hermes memory requires an explicit domain projection");
    return new WorldAgent(directory, {
      agent_id: requiredString(request.agent_id || "hermes", "agent_id", 256),
      ideas,
      startTime: Number.isSafeInteger(request.at) ? request.at : 0,
    });
  }
  return new WorldAgent(directory);
}

function context(agent, limit = 24) {
  const state = agent.state();
  const snapshot = agent.snapshot();
  const sources = Object.fromEntries(Object.entries(state.sources).map(([id, value]) => [id, value]));
  const accepted = snapshot.items.slice(-limit).map(item => ({
    id: item.id,
    program: item.program,
    source: item.source,
    source_group: item.source_group,
    source_group_assurance: item.source_group_assurance ?? "legacy_unspecified",
    source_group_attestation: item.source_group_attestation ?? null,
    source_text: sources[item.source]?.text || "",
    observed_at: item.observedAt,
    valid_from: item.validFrom,
    valid_to: item.validTo,
    admission: item.admission,
  }));
  const candidates = Object.values(state.proposals)
    .filter(proposal => proposal.status === "candidate")
    .slice(-limit)
    .map(proposal => ({ id: proposal.id, source: proposal.source, source_group: sources[proposal.source]?.source_group ?? proposal.source, source_group_assurance: sources[proposal.source]?.source_group_assurance ?? "legacy_unspecified", source_group_attestation: sources[proposal.source]?.source_group_attestation ?? null, source_text: sources[proposal.source]?.text || "", items: proposal.items }));
  return {
    profile: snapshot.profile,
    projection: snapshot.ideas.version,
    snapshot_sha256: snapshot.sha256,
    journal_head: state.journal_head,
    accepted,
    candidates,
  };
}

function existingInterpretation(agent, inputSha256) {
  return agent.state().events.find(event => event.type === "interpretation" && event.payload.evidence?.input_sha256 === inputSha256) || null;
}

function sameGoal(active, proposed) {
  if (!active || !proposed || active.id !== proposed.id || active.query !== proposed.query || active.action !== proposed.action) return false;
  const proposedPolicy = normalizeActionPolicy(proposed.actionPolicy ?? null);
  return JSON.stringify(active.actionPolicy ?? null) === JSON.stringify(proposedPolicy);
}

async function hostDecision(agent, request) {
  const goal = request.goal;
  const state = agent.state();
  if (!state.goal) {
    if (!goal || typeof goal !== "object" || Array.isArray(goal)) throw new Error("first host decision needs a declared goal");
    await agent.startGoal({
      id: requiredString(goal.id, "goal.id", 256),
      text: requiredString(goal.text, "goal.text"),
      query: requiredString(goal.query, "goal.query"),
      action: requiredString(goal.action, "goal.action", 256),
      questions: goal.questions === undefined ? [] : goal.questions,
      budget: goal.budget === undefined ? {} : goal.budget,
      actionPolicy: goal.actionPolicy === undefined ? null : goal.actionPolicy,
    });
  } else if (goal && !sameGoal(state.goal, goal)) {
    throw new Error("declared goal differs from active episode");
  }
  const before = agent.snapshot();
  const decision = await agent.step({ strategy: "missing" });
  const activePolicy = agent.state().goal?.actionPolicy;
  return {
    status: "host_policy_decision",
    authority: activePolicy
      ? `WorldAgent signed-horn safe policy v0 + ${activePolicy.id}`
      : "WorldAgent signed-horn safe policy v0",
    external_action: "not_executed",
    snapshot_sha256: before.sha256,
    decision,
  };
}

async function handle(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("JSON object required");
  const agent = open(request);
  switch (request.action) {
    case "init": return { status: "ready", ...context(agent) };
    case "context": return context(agent, request.limit);
    case "reflection_status": {
      const inputSha256 = requiredString(request.input_sha256, "input_sha256", 128);
      const event = existingInterpretation(agent, inputSha256);
      return { status: event ? "recorded" : "absent", event_id: event?.id || null };
    }
    case "sync_turn": {
      const session = requiredString(request.session_id || "unknown", "session_id", 512);
      const user = requiredString(request.user_content, "user_content");
      const assistant = typeof request.assistant_content === "string" ? request.assistant_content : "";
      const userId = agent.observe(user, { at: agent.state().now + 1, kind: `hermes_user_turn:${session}`, sourceGroup: request.user_source_group ?? null, sourceGroupAttestation: request.user_source_group_attestation ?? null });
      const assistantId = assistant.trim() ? agent.observe(assistant, { at: agent.state().now + 1, kind: `hermes_assistant_turn:${session}`, sourceGroup: request.assistant_source_group ?? null, sourceGroupAttestation: request.assistant_source_group_attestation ?? null }) : null;
      return { status: "recorded_as_sources_only", user_source: userId, assistant_source: assistantId, snapshot_sha256: agent.snapshot().sha256 };
    }
    case "propose": {
      const source = agent.observe(requiredString(request.source_text, "source_text"), { at: agent.state().now + 1, kind: request.source_kind || "hermes_proposal_source", sourceGroup: request.source_group ?? null, sourceGroupAttestation: request.source_group_attestation ?? null });
      const proposalId = agent.propose(source, request.items, { interpretation: request.interpretation || "hermes_explicit_proposal" });
      return { status: "candidate", proposal_id: proposalId, source, snapshot_sha256: agent.snapshot().sha256 };
    }
    case "record_interpretation": {
      const evidence = request.evidence;
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new Error("interpretation evidence required");
      const inputSha256 = requiredString(evidence.input_sha256, "input_sha256", 128);
      const duplicate = existingInterpretation(agent, inputSha256);
      if (duplicate) return { status: "duplicate", event_id: duplicate.id, snapshot_sha256: agent.snapshot().sha256 };
      if (!Array.isArray(request.items) || request.items.length > 16) throw new Error("interpretation needs 0..16 candidate items");
      const source = agent.observe(requiredString(request.source_text, "source_text"), { at: agent.state().now + 1, kind: "hermes_session_reflection_source", sourceGroup: request.source_group ?? null, sourceGroupAttestation: request.source_group_attestation ?? null });
      const status = request.items.length ? "candidate" : "needs_clarification";
      const interpretation = agent.journal.append("interpretation", { source, evidence: clone(evidence), status }, agent.state().now, agent.state().journal_head);
      if (!request.items.length) return { status, source, interpretation_event: interpretation.id, proposal_id: null, snapshot_sha256: agent.snapshot().sha256 };
      const proposalId = agent.propose(source, request.items, { interpretation: clone(evidence) });
      return { status, source, interpretation_event: interpretation.id, proposal_id: proposalId, snapshot_sha256: agent.snapshot().sha256 };
    }
    case "admit": {
      const event = await agent.admit(requiredString(request.proposal_id, "proposal_id", 256), {
        admit: true,
        by: requiredString(request.by, "by", 256),
        reason: requiredString(request.reason, "reason"),
      });
      return { status: "accepted_for_use_not_certified_true", admission_event: event.id, snapshot_sha256: agent.snapshot().sha256 };
    }
    case "query": {
      const before = agent.snapshot();
      const result = await check({ snapshot: before, query: requiredString(request.query, "query", 32768) });
      if (!request.audit) return result;
      const receipt = agent.journal.append("thought", {
        kind: "hermes_memory_query",
        snapshot: before.sha256,
        query: result.query,
        result,
        epistemicMeaning: "read-only check; proof status is scoped to the recorded snapshot",
      }, agent.state().now, agent.state().journal_head);
      return { ...result, journal_event: receipt.id, snapshot_unchanged: agent.snapshot().sha256 === before.sha256 };
    }
    case "decide": return hostDecision(agent, request);
    case "dream": {
      if (!Array.isArray(request.assumptions) || request.assumptions.length < 1) throw new Error("dream needs explicit assumptions");
      const before = agent.snapshot();
      const assumptions = request.assumptions.map((value, index) => ({
        id: `_conditional_${index + 1}`,
        source: "conditional:hermes-dream",
        program: typeof value === "string" ? value : value.program,
      }));
      const result = await check({ snapshot: before, query: requiredString(request.query, "query", 32768), assumptions });
      const after = agent.snapshot();
      let journalEvent = null;
      if (request.audit) journalEvent = agent.journal.append("thought", {
        kind: "hermes_memory_dream",
        snapshot: before.sha256,
        assumptions,
        result,
        epistemicMeaning: "conditional execution only; assumptions were not admitted",
      }, agent.state().now, agent.state().journal_head).id;
      return { status: "conditional", snapshot_before: before.sha256, snapshot_after: agent.snapshot().sha256, unchanged: agent.snapshot().sha256 === before.sha256, result, journal_event: journalEvent };
    }
    default: throw new Error("unknown action");
  }
}

async function main() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) throw new Error("request too large");
    chunks.push(chunk);
  }
  const result = await handle(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
}

if (require.main === module) main().catch(error => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
  process.exitCode = 1;
});

module.exports = { handle, context };
