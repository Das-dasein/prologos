"use strict";

// A bounded P2-hybrid broker. It compiles only an explicit Horn projection of
// fixed case formulas. Callers select an opaque predeclared goal id, never a
// program, arbitrary query, filesystem path, or shell command.
const { consult, query } = require("./prolog-engine");
const crypto = require("node:crypto");

function unwrap(text) {
  const value = text.trim();
  if (!value.startsWith("(") || !value.endsWith(")")) return value;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) { if (value[index] === "(") depth += 1; else if (value[index] === ")") depth -= 1; if (depth === 0 && index < value.length - 1) return value; }
  return depth === 0 ? unwrap(value.slice(1, -1)) : value;
}
function splitTopLevel(text, marker) {
  let depth = 0;
  for (let index = 0; index <= text.length - marker.length; index += 1) { if (text[index] === "(") depth += 1; else if (text[index] === ")") depth -= 1; else if (depth === 0 && text.slice(index, index + marker.length) === marker) return [text.slice(0, index), text.slice(index + marker.length)]; }
  return null;
}
function literal(text) {
  const value = unwrap(text), negated = value.startsWith("¬"), atom = unwrap(negated ? value.slice(1) : value).match(/^([A-Za-z_][A-Za-z0-9_]*)\(([^()]*)\)$/);
  return atom ? { predicate: atom[1], args: atom[2].split(",").map(value => value.trim()), negated } : null;
}
function render(item) { return `${item.negated ? "neg_" : ""}${item.predicate}(${item.args.map(value => /^[a-z]$/.test(value) ? value.toUpperCase() : `'${value.replace(/'/g, "''")}'`).join(",")})`; }
function body(text) { const parts = splitTopLevel(unwrap(text), "∧"); if (parts) { const left = body(parts[0]), right = body(parts[1]); return left && right ? [...left, ...right] : null; } const item = literal(text); return item ? [item] : null; }
function hornClause(formula) {
  let value = unwrap(formula); const quantified = value.match(/^∀[a-z]\s+(.+)$/u); if (quantified) value = unwrap(quantified[1]);
  const implication = splitTopLevel(value, "→");
  if (implication) { const head = literal(implication[1]), conditions = body(implication[0]); return head && conditions ? { kind: "rule", head, body: conditions } : null; }
  const fact = literal(value); return fact ? { kind: "fact", fact } : null;
}
function compileHorn(formulas) {
  const clauses = formulas.map(hornClause).filter(Boolean);
  const program = clauses.map(clause => clause.kind === "fact" ? `${render(clause.fact)}.` : `${render(clause.head)} :- ${clause.body.map(render).join(", ")}.`).join("\n") + "\n";
  const constants = [...new Set(clauses.flatMap(clause => (clause.kind === "fact" ? [clause.fact] : [clause.head, ...clause.body]).flatMap(item => item.args.filter(arg => !/^[a-z]$/.test(arg)))))];
  const goals = new Map(), chainGoals = new Map();
  function addGroundings(item, isChainGoal = false) {
    const variables = [...new Set(item.args.filter(arg => /^[a-z]$/.test(arg)))];
    const assignments = variables.reduce((rows, variable) => rows.flatMap(row => constants.map(constant => ({ ...row, [variable]: constant }))), [{}]);
    for (const assignment of assignments) {
      const ground = { ...item, args: item.args.map(arg => assignment[arg] || arg) }, rendered = render(ground);
      goals.set(rendered, rendered);
      if (isChainGoal) chainGoals.set(rendered, rendered);
    }
  }
  for (const clause of clauses) {
    if (clause.kind === "fact") addGroundings(clause.fact);
    else { addGroundings(clause.head, true); for (const item of clause.body) addGroundings(item); }
  }
  return { program, goals: [...goals.values()].sort(), chain_goals: [...chainGoals.values()].sort() };
}
function createBroker(fixture) {
  const cases = new Map((fixture.cases || []).map(item => {
    const compiled = compileHorn(item.private_formulas || []), goalIds = new Map(compiled.goals.map((goal, index) => [`g${index + 1}`, goal]));
    const preferred = compiled.chain_goals.length ? compiled.chain_goals : compiled.goals;
    const chosen = preferred.length ? preferred[parseInt(crypto.createHash("sha256").update(`proverqa-chain:${item.case_id}`).digest("hex").slice(0, 8), 16) % preferred.length] : null;
    const selectedGoalId = [...goalIds.entries()].find(([, goal]) => goal === chosen)?.[0] || null;
    return [item.case_id, { compiled, goals: goalIds, selectedGoalId }];
  }));
  return Object.freeze({
    catalog(caseId) { const entry = cases.get(caseId); if (!entry) throw new Error("unknown broker case"); return Object.freeze([...entry.goals.keys()]); },
    predeclaredGoal(caseId) {
      const entry = cases.get(caseId); if (!entry) throw new Error("unknown broker case");
      if (!entry.selectedGoalId) throw new Error("broker case has no Horn goal");
      return Object.freeze({ goal_id: entry.selectedGoalId, goal: entry.goals.get(entry.selectedGoalId), selection: entry.compiled.chain_goals.length ? "rule-head" : "fact-fallback" });
    },
    compiledProgram(caseId) {
      const entry = cases.get(caseId); if (!entry) throw new Error("unknown broker case");
      return entry.compiled.program;
    },
    async invoke({ caseId, goalId }) { const entry = cases.get(caseId); if (!entry) throw new Error("unknown broker case"); const goal = entry.goals.get(goalId); if (!goal) throw new Error("goalId is not predeclared for this case"); const session = await consult(entry.compiled.program); const result = await query(session, `${goal}.`); return Object.freeze({ status: result.length ? "entailed" : "unknown", receipt: Object.freeze({ case_id: caseId, goal_id: goalId, broker_goal: goal, program_clause_count: entry.compiled.program.trim() ? entry.compiled.program.trim().split("\n").length : 0 }) }); }
  });
}
module.exports = { compileHorn, createBroker, hornClause };
