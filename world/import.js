"use strict";
const { check, program, hash } = require("./checker");

// Imports create proposals. Source archives stay in biography, not executable code.
async function fromAssertions(agent, text, { at = agent.state().now } = {}) {
  const snapshot = agent.snapshot(), p = snapshot.ideas.predicates[0];
  const query = p.arity ? `${p.name}(${Array(p.arity).fill("probe").join(",")})` : p.name;
  const result = await check({ snapshot: { ...snapshot, items: [] }, query, mode: "import_assertions", importText: text });
  if (result.status !== "imported") throw new Error(`assertion import refused: ${result.reason}`);
  if (!result.items.length) throw new Error("no explicitly accepted active assertions to import");
  const source = agent.observe(text, { at, kind: "assertion_journal_import" });
  const proposalId = agent.propose(source, result.items.map(item => ({ ...item, origin: { format: "assertion-envelope", item_id: item.id, source: item.original_source, archive_sha256: hash(text) } })), { interpretation: "explicit-assertion-envelope-projection-v0" });
  return { proposalId, imported: result.items.map(x => x.id), skipped: result.original_ids.filter(id => !result.items.some(x => x.id === id)), evidence: result.evidence };
}
function fromCognitive(agent, snapshot, { at = agent.state().now } = {}) {
  if (!snapshot || !Array.isArray(snapshot.items)) throw new Error("cognitive snapshot items required");
  const accepted = snapshot.items.filter(x => x.status === "accepted");
  const visible = accepted.filter(x => (x.admittedAt ?? at) <= at && (x.observedAt ?? at) <= at);
  const replaced = new Set(visible.filter(x => (x.validFrom ?? at) <= at).map(x => x.replaces).filter(Boolean));
  const items = visible.filter(x => !replaced.has(x.id) && (x.validFrom ?? at) <= at && (x.validTo == null || x.validTo >= at)).map(item => {
    let text = program(item.program);
    if (item.polarity) {
      if (!["positive", "negative"].includes(item.polarity) || !item.proposition || program(item.proposition) !== text) throw new Error("import requires matching explicit proposition/program; arbitrary signed rule mapping needs review");
      if (item.polarity === "negative") text = `neg(${item.proposition.trim().replace(/\.$/, "")}).`;
    }
    return { id: item.id, program: text, validFrom: item.validFrom ?? at, validTo: item.validTo ?? null, modality: item.modality ?? "asserted",
      origin: { format: "cognitive-snapshot", snapshot_id: snapshot.id, item_id: item.id, source: item.source, archive_sha256: hash(snapshot) } };
  });
  const source = agent.observe(JSON.stringify(snapshot), { at, kind: "cognitive_snapshot_import" });
  return { proposalId: agent.propose(source, items, { interpretation: "explicit-cognitive-snapshot-projection-v0" }), imported: items.map(x => x.id), skipped: snapshot.items.filter(x => !items.some(i => i.id === x.id)).map(x => x.id), scope: "current projection at import time; full source archive retained" };
}
module.exports = { fromAssertions, fromCognitive };
