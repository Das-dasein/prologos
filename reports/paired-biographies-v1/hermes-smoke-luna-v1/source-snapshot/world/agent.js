"use strict";
const { Journal, prepareItems, nonempty, tick } = require("./journal");
const { check, hash, clone, program } = require("./checker");
const { createSnapshot, createCandidate, runThought } = require("../cognitive-memory");
const negate = literal => literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`;
const DEFAULT_BUDGET = { queries: 24, branches: 8, questions: 2, maxQuestionCost: 1 };

function proofFor(result, literal = result.query) {
  const map = new Map((result.safe || []).map(x => [x.literal, x])), used = new Set();
  function visit(term) { if (used.has(term)) return; const node = map.get(term); if (!node) return; node.children.forEach(visit); used.add(term); }
  visit(literal); return [...used].map(x => map.get(x));
}
function simpleChoice(result, questions) {
  if (result.status !== "ok" || result.safe_status !== "unknown" || result.raw_status === "conflict") return null;
  const plans = result.plans.filter(p => p.missing.length && p.missing.every(m => questions.some(q => q.literal === m || negate(q.literal) === m)));
  const possible = questions.filter(q => plans.some(p => p.missing.includes(q.literal) || p.missing.includes(negate(q.literal))));
  return possible.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))[0] ?? null;
}

class WorldAgent {
  constructor(directory, config) { this.journal = new Journal(directory, config); }
  state() { return this.journal.state(); }
  snapshot(at) { return this.journal.snapshot(at); }
  observe(text, { at = this.state().now, kind = "message" } = {}) {
    nonempty(text, "source text");
    return this.journal.append("source", { text, kind }, at).id;
  }
  propose(source, input, { interpretation = "explicit-operator", at = this.state().now } = {}) {
    const state = this.state(); if (!state.sources[source]) throw new Error("proposal needs a recorded source event");
    const items = prepareItems(input, source, state), id = `proposal_${state.events.length + 1}`;
    this.journal.append("proposal", { id, source, interpretation, items }, at, state.journal_head); return id;
  }
  async admit(proposalId, decision) {
    if (!decision || decision.admit !== true) throw new Error("explicit admission decision required");
    nonempty(decision.by, "admission authority"); nonempty(decision.reason, "admission reason");
    const state = this.state(), proposal = state.proposals[proposalId];
    if (!proposal || proposal.status !== "candidate") throw new Error("unknown or already admitted proposal");
    const pred = state.ideas.predicates[0];
    const probe = pred.arity ? `${pred.name}(${Array(pred.arity).fill("poc_probe").join(",")})` : pred.name;
    const checked = await check({ snapshot: { ideas: state.ideas, items: proposal.items }, query: probe, mode: "validate" });
    if (checked.status !== "valid") throw new Error(`proposal not supported by trusted profile: ${checked.reason}`);
    return this.journal.append("admission", { proposalId, decision: clone(decision), checks: checked, epistemicMeaning: "accepted for use; no empirical truth certification" }, state.now, state.journal_head);
  }
  async startGoal({ id, text, query, action, questions = [], budget = {} }) {
    const state = this.state();
    if (state.goal && !["completed", "failed"].includes(state.goal.status)) throw new Error("finish the existing goal before starting another");
    nonempty(id, "goal id"); nonempty(text, "goal text"); nonempty(action, "action");
    if (state.goals.some(g => g.id === id)) throw new Error("goal id already used");
    if (!Array.isArray(questions) || questions.length > 4) throw new Error("at most four declared questions in PoC");
    const snapshot = this.snapshot(), checked = await check({ snapshot, query, mode: "validate" });
    if (checked.status !== "valid") throw new Error(`unsupported goal: ${checked.reason}`);
    const normalized = [], ids = new Set();
    for (const q of questions) {
      nonempty(q.id, "question identity"); nonempty(q.text, "question text");
      if (ids.has(q.id)) throw new Error("duplicate question identity"); ids.add(q.id);
      const result = await check({ snapshot, query: q.literal, mode: "validate" });
      if (result.status !== "valid" || !Number.isFinite(q.cost) || q.cost < 0) throw new Error("invalid question");
      normalized.push({ id: q.id, text: q.text, literal: result.query, cost: q.cost });
    }
    const limits = { ...DEFAULT_BUDGET, ...budget };
    if (Object.keys(limits).some(k => !Object.hasOwn(DEFAULT_BUDGET, k)) || Object.values(limits).some(v => !Number.isSafeInteger(v) || v < 0)) throw new Error("invalid goal budget");
    return this.journal.append("goal", { id, text, query: checked.query, action, questions: normalized, budget: limits, commitments: [{ id: "require_safe_proof", source: "operator goal policy v0" }] }, state.now, state.journal_head);
  }
  async step({ strategy = "missing", limits = {} } = {}) {
    if (!["dream", "missing"].includes(strategy)) throw new Error("strategy must be dream or missing");
    if (Object.keys(limits).some(k => !["timeoutMs", "inferences", "maxFacts", "maxOutputBytes"].includes(k))) throw new Error("only resource limits may be overridden");
    let state = this.state(); const goal = state.goal;
    if (!goal) throw new Error("no current goal");
    if (["completed", "failed"].includes(goal.status)) return { kind: "done", goalId: goal.id, status: goal.status, outcome: goal.outcome };
    if (goal.status === "awaiting_outcome") return { kind: "await_outcome", goalId: goal.id, decisionId: goal.decision.eventId, action: goal.action };
    if (goal.status !== "active") return clone(goal.decision ?? { kind: "pause", reason: goal.status });
    if (goal.inFlight) throw new Error("interrupted reflection recorded; reserved budget retained; inspect journal before recovery");
    const snapshot = this.snapshot();
    const eligible = goal.questions.filter(q => q.cost <= goal.budget.maxQuestionCost);
    const reserved = { queries: 1 + (strategy === "dream" ? eligible.length * 2 : 0), branches: strategy === "dream" ? eligible.length * 2 : 0 };
    const pause = reason => ({ kind: "pause", reason, goalId: goal.id, snapshot: snapshot.sha256 });
    if (Object.keys(reserved).some(k => goal.spent[k] + reserved[k] > goal.budget[k])) {
      const decision = pause("budget_exhausted"); this.journal.append("decision", decision, state.now, state.journal_head); return decision;
    }
    this.journal.append("reflection_started", { goalId: goal.id, strategy, snapshot: snapshot.sha256, reserved }, state.now, state.journal_head);
    state = this.state();
    const safeCheck = async args => { try { return await check({ ...args, ...limits }); } catch (e) { return { status: "execution_error", reason: e.message }; } };
    const baseline = await safeCheck({ snapshot, query: goal.query });
    const cost = { queries: 1, branches: 0 }, questions = [];
    if (baseline.status === "ok" && strategy === "dream") for (const q of eligible) {
      const known = baseline.raw.some(n => n.literal === q.literal || n.literal === negate(q.literal));
      if (known) { questions.push({ question: q, disposition: "already_known_or_conflicted", branches: [] }); continue; }
      const branches = [];
      for (const [polarity, literal] of [["positive", q.literal], ["negative", negate(q.literal)]]) {
        const assumption = { id: `assumption_${hash(q).slice(0, 12)}_${polarity}`, source: `conditional:${q.id}:${polarity}`, program: program(literal) };
        const result = await safeCheck({ snapshot, query: goal.query, assumptions: [assumption] });
        cost.queries++; cost.branches++;
        branches.push({ polarity, assumption, result });
      }
      const complete = branches.every(b => b.result.status === "ok");
      const actionChanges = complete && (branches[0].result.safe_status === "entailed") !== (branches[1].result.safe_status === "entailed");
      questions.push({ question: q, disposition: !complete ? "unresolved" : actionChanges ? "decision_relevant" : "irrelevant_to_this_goal", branches });
    }
    const simple = baseline.status === "ok" ? simpleChoice(baseline, eligible) : null;
    let decision;
    if (baseline.status !== "ok" || questions.some(q => q.disposition === "unresolved")) decision = pause("incomplete_check");
    else if (baseline.safe_status === "entailed") decision = { kind: "act", action: goal.action, goalId: goal.id, snapshot: snapshot.sha256, proof: proofFor(baseline), mode: "simulated_action_request" };
    else if (baseline.raw_status === "conflict") decision = pause("goal_conflicted");
    else if (baseline.safe_status === "contradicted") decision = pause("goal_contradicted");
    else {
      const useful = strategy === "missing" ? simple : questions.filter(q => q.disposition === "decision_relevant").map(q => q.question).sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))[0];
      decision = useful && goal.spent.questions < goal.budget.questions
        ? { kind: "ask", question: useful, goalId: goal.id, snapshot: snapshot.sha256, reason: strategy === "dream" ? "conditional_action_changes" : "missing_premise" }
        : pause(useful ? "question_budget_exhausted" : "no_supported_next_action");
    }
    const after = this.snapshot(snapshot.at);
    if (after.sha256 !== snapshot.sha256) throw new Error("memory changed during reflection");
    const receipt = { goalId: goal.id, strategy, snapshot, snapshot_after: after.sha256, baseline, questions, simple_control: simple, cost, decision };
    const finished = this.journal.append("reflection", receipt, state.now, state.journal_head);
    const chosen = this.journal.append("decision", decision, state.now, finished.sha256);
    return { ...decision, eventId: chosen.id };
  }
  async answer(answer, { at = this.state().now, evidenceText } = {}) {
    if (!["yes", "no", "unknown"].includes(answer)) throw new Error("answer must be yes, no or unknown");
    const state = this.state(), goal = state.goal;
    if (!goal?.pending || !["waiting", "paused"].includes(goal.status)) throw new Error("no pending question");
    const question = goal.pending;
    const source = this.observe(evidenceText ?? `${question.text} — ${answer}`, { at, kind: "answer" });
    if (answer !== "unknown") {
      const proposal = this.propose(source, [{ program: answer === "yes" ? question.literal : negate(question.literal) }], { interpretation: "explicit-binary-answer-v0" });
      await this.admit(proposal, { admit: true, by: "explicit-binary-answer-v0", reason: `The participant explicitly answered ${answer} to the recorded question; no empirical verification claimed.` });
    }
    return this.journal.append("reply", { goalId: goal.id, question, answer, source }, at, this.state().journal_head);
  }
  outcome(outcome, text, { at = this.state().now } = {}) {
    nonempty(text, "observed outcome");
    const state = this.state(), goal = state.goal;
    if (!goal || goal.status !== "awaiting_outcome" || !["success", "failure"].includes(outcome)) throw new Error("outcome requires a pending action and success/failure");
    return this.journal.append("action_result", { goalId: goal.id, decisionId: goal.decision.eventId, outcome, text, mode: "reported_simulation_outcome" }, at, state.journal_head);
  }
  resume(reason) {
    nonempty(reason, "resume reason"); const state = this.state();
    if (!state.goal || !(state.goal.status === "paused" || state.goal.inFlight)) throw new Error("only paused or interrupted episodes can resume");
    return this.journal.append("resume", { reason, by: "operator", abandonedReflection: state.goal.inFlight ?? null, budgetReset: false }, state.now, state.journal_head);
  }
  async think(source, fullProgram, query, { timeoutMs = 1500 } = {}) {
    const state = this.state(); if (!state.sources[source]) throw new Error("thought needs source event");
    const memory = this.snapshot();
    const snapshot = createSnapshot({ id: memory.sha256, items: memory.items.map(x => ({ ...x, status: "accepted" })) });
    const candidate = createCandidate({ id: `thought_${state.events.length + 1}`, program: fullProgram, source });
    const evidence = await runThought({ snapshot, candidate, goal: query, timeoutMs, forbidSubprocesses: true });
    return this.journal.append("thought", { source, memory, candidate: clone(candidate), query, evidence, trust: "untrusted", memory_after: this.snapshot(memory.at).sha256 }, state.now, state.journal_head);
  }
}
module.exports = { WorldAgent, DEFAULT_BUDGET, negate, proofFor, simpleChoice };
