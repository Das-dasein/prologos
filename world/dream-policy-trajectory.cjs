#!/usr/bin/env node
"use strict";

// Replays the single bounded-search witness as an interactive episode.  It
// compares an information-cost (questions) and execution-cost (checker calls)
// trade-off; it makes no claim about truth, source quality, or model behavior.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { WorldAgent } = require("./agent");

const IDEAS = { version: "dream-policy-trajectory-v4", predicates: [{ name: "release", arity: 1 }, { name: "p", arity: 1 }, { name: "q", arity: 1 }] };
const WITNESS_PROGRAMS = [
  { id: "rule_q", program: "release(X) :- q(X)." },
  { id: "rule_pq", program: "release(X) :- p(X), q(X)." }
];
const QUESTIONS = [
  { id: "p", text: "p(orion)?", literal: "p(orion)", cost: 1 },
  { id: "q", text: "q(orion)?", literal: "q(orion)", cost: 1 }
];
const sha = value => crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");

function decisionProjection(decision) {
  if (decision.kind === "ask") return { kind: "ask", target: decision.question.literal, reason: decision.reason };
  if (decision.kind === "act") return { kind: "act", target: decision.action, mode: decision.mode };
  return { kind: decision.kind, reason: decision.reason };
}
function publicReflection(reflection) {
  return {
    baseline: { status: reflection.baseline.status, raw_status: reflection.baseline.raw_status, safe_status: reflection.baseline.safe_status },
    questions: reflection.questions.map(entry => ({
      target: entry.question.literal,
      disposition: entry.disposition,
      branches: entry.branches.map(branch => ({ polarity: branch.polarity, assumed: branch.assumption.program, status: branch.result.status, safe_status: branch.result.safe_status }))
    })),
    branch_assumptions: "disposable checker inputs recorded in reflection; not proposed or admitted into the snapshot"
  };
}
async function runTrajectory(strategy, directory) {
  const agent = new WorldAgent(directory, { agent_id: `trajectory_${strategy}`, ideas: IDEAS, startTime: 0 });
  const source = agent.observe(WITNESS_PROGRAMS.map(row => row.program).join("\n"), { at: 1, kind: "bounded_policy_witness" });
  const proposal = agent.propose(source, WITNESS_PROGRAMS, { at: 1, interpretation: "fixed bounded-search witness" });
  await agent.admit(proposal, { admit: true, by: "bounded_policy_trajectory", reason: "synthetic witness for policy-cost comparison; no truth claim" });
  await agent.startGoal({ id: "release", text: "release witness", query: "release(orion)", action: "release(orion)", questions: QUESTIONS });

  const initialSnapshot = agent.snapshot();
  const steps = [];
  for (let round = 0; round < 3; round++) {
    const decision = await agent.step({ strategy });
    const state = agent.state();
    steps.push({ round: round + 1, decision: decisionProjection(decision), reflection: publicReflection(state.goal.reflection), spent_after_decision: { ...state.goal.spent } });
    if (decision.kind !== "ask") break;
    await agent.answer("yes", { at: state.now + 1, evidenceText: `Synthetic participant answers yes to ${decision.question.literal}.` });
  }
  const state = agent.state();
  return {
    strategy,
    initial_accepted_snapshot_sha256: initialSnapshot.sha256,
    final_accepted_snapshot_sha256: agent.snapshot().sha256,
    accepted_item_programs: agent.snapshot().items.map(item => item.program),
    steps,
    final_decision: decisionProjection(state.goal.decision),
    final_goal_status: state.goal.status,
    cost: { ...state.goal.spent },
    questions_answered_yes: state.items.filter(item => item.program === "p(orion)." || item.program === "q(orion).").map(item => item.program)
  };
}
async function compare({ directory } = {}) {
  const temporary = directory ?? fs.mkdtempSync(path.join(os.tmpdir(), "dream-policy-trajectory-"));
  const cleanup = directory === undefined;
  try {
    const missing = await runTrajectory("missing", path.join(temporary, "missing"));
    const dream = await runTrajectory("dream", path.join(temporary, "dream"));
    return {
      witness: { programs: WITNESS_PROGRAMS.map(row => row.program), questions: QUESTIONS.map(row => row.literal), participant_policy: "answer yes to every question actually asked" },
      missing,
      dream,
      comparison: {
        final_action_equal: missing.final_decision.kind === "act" && dream.final_decision.kind === "act" && missing.final_decision.target === dream.final_decision.target,
        question_saving_for_dream: missing.cost.questions - dream.cost.questions,
        additional_checker_queries_for_dream: dream.cost.queries - missing.cost.queries,
        interpretation: "For this fixed favorable answer path, both strategies ask the same number of human questions and reach the same action; dream spends additional checker executions. This is a bounded policy-cost observation, not a truth, utility, or model-quality result."
      }
    };
  } finally { if (cleanup) fs.rmSync(temporary, { recursive: true, force: true }); }
}
function outputPath(argv) { if (argv.length !== 2 || argv[0] !== "--out" || !argv[1]) throw new Error("Usage: dream-policy-trajectory.cjs --out NEW_REPORT.json"); return path.resolve(argv[1]); }
async function main() {
  const out = outputPath(process.argv.slice(2)); if (fs.existsSync(out)) throw new Error("refusing to overwrite receipt");
  const result = await compare();
  const receipt = {
    version: "dream-policy-trajectory-v4", status: "completed",
    boundary: "One interactive trajectory of the one witness found by the declared finite policy search. Both strategies receive affirmative answers only to questions they actually ask. It is not a distributional evaluation or a theorem about arbitrary programs, users, sources, values, or models.",
    source_sha256: { trajectory: sha(fs.readFileSync(__filename)), agent: sha(fs.readFileSync(path.join(__dirname, "agent.js"))), checker: sha(fs.readFileSync(path.join(__dirname, "checker.pl"))) },
    ...result
  };
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ out, missing: result.missing.cost, dream: result.dream.cost, ...result.comparison }) + "\n");
}
if (require.main === module) main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
module.exports = { WITNESS_PROGRAMS, QUESTIONS, runTrajectory, compare };
