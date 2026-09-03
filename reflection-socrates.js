"use strict";

const fs = require("node:fs");
const { ReflectionProposal } = require("./llm-schema");

const ID = /^[a-z][a-z0-9_]*$/;

function assertionIds(memory) {
  return new Set([...memory.matchAll(/(?:^|\n)assertion\(([^,\s]+)/g)].map(match => match[1]));
}

function diagnosticHasPair(report, first, second) {
  return (report.duplicates || []).some(item => item.includes(first) && item.includes(second));
}

function validateReflectionProposal(input, memory, report = {}) {
  const proposal = ReflectionProposal.parse(input);
  const ids = assertionIds(memory);
  for (const action of proposal.actions) {
    if (action.action === "mark_duplicate") {
      if (!ids.has(action.canonical_id) || !ids.has(action.duplicate_id)) throw new Error("Socrates: duplicate references an unknown assertion");
      if (action.canonical_id === action.duplicate_id) throw new Error("Socrates: an assertion cannot duplicate itself");
      if (!diagnosticHasPair(report, action.canonical_id, action.duplicate_id)) throw new Error("Socrates: duplicate is not supported by diagnostics");
    } else if (action.action === "propose_alias") {
      if (!ID.test(action.from) || !ID.test(action.to) || action.from === action.to) throw new Error("Socrates: invalid identity alias");
    } else if (action.action === "propose_revision") {
      if (!ids.has(action.new_id) || !ids.has(action.old_id) || action.new_id === action.old_id) throw new Error("Socrates: revision references invalid assertions");
    } else if (!ids.has(action.assertion_id)) {
      throw new Error("Socrates: review references an unknown assertion");
    }
  }
  return proposal;
}

function applyApprovedReflection(proposal, memoryPath, { approved = false, report = {} } = {}) {
  if (!approved) throw new Error("Socrates: explicit approval is required before writing memory");
  const memory = fs.readFileSync(memoryPath, "utf8");
  const checked = validateReflectionProposal(proposal, memory, report);
  const writes = checked.actions.flatMap(action => {
    if (action.action === "mark_duplicate") return [`assertion_revision(${action.canonical_id}, replaces, ${action.duplicate_id}).`];
    if (action.action === "propose_revision") return [`assertion_revision(${action.new_id}, ${action.relation}, ${action.old_id}).`];
    if (action.action === "review") return [`assertion_status_event(${action.assertion_id}, reviewed).`];
    return [];
  });
  if (writes.length) fs.appendFileSync(memoryPath, `${writes.join("\n")}\n`, "utf8");
  return { applied: writes, deferred: checked.actions.filter(action => ["propose_alias", "review"].includes(action.action)) };
}

module.exports = { validateReflectionProposal, applyApprovedReflection };
