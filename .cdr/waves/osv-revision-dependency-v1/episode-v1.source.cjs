"use strict";

const { prepareBundle, prologAtom, timestampKey, toWorldItem } = require("../osv-advisory");

const IDEAS = { version: "osv-revision-dependency-v1", predicates: [{ name: "record_claims_affected", arity: 3 }, { name: "osv_entry_withdrawn", arity: 1 }] };

function literalFromProgram(program) {
  if (typeof program !== "string" || !program.endsWith(".") || program.includes(":-")) throw new Error("episode item must contain one fact");
  return program.slice(0, -1);
}

function opposite(literal) { return literal.startsWith("neg(") && literal.endsWith(")") ? literal.slice(4, -1) : `neg(${literal})`; }

function buildEpisode(oldRaw, newRaw, target, { dependencies = true } = {}) {
  const descriptors = prepareBundle([oldRaw, newRaw], target);
  if (descriptors.length !== 2 || descriptors[0].id !== descriptors[1].id) throw new Error("episode requires two revisions of one OSV entry");
  const [oldDescriptor, newDescriptor] = descriptors;
  if (timestampKey(oldDescriptor.modified) >= timestampKey(newDescriptor.modified)) throw new Error("episode revisions are not ordered");
  const oldItem = toWorldItem(oldDescriptor);
  if (!oldItem) throw new Error("old revision needs a determinate assessment");
  const copyItem = {
    id: `osv_copy_${oldItem.id.slice("osv_item_".length)}`,
    program: oldItem.program,
    ...(dependencies ? { dependsOn: [oldItem.id] } : {}),
    origin: { kind: "explicit_imported_copy_v1", source_item_id: oldItem.id, entry_id: oldDescriptor.id, modified: oldDescriptor.modified },
  };
  let newItem = toWorldItem(newDescriptor);
  if (newDescriptor.assessment.status === "withdrawn") newItem = {
    id: `osv_withdrawal_${prologAtom(`${newDescriptor.id}:${newDescriptor.modified}`).slice(4)}`,
    program: `osv_entry_withdrawn(${prologAtom(newDescriptor.id)}).`,
    origin: { kind: "osv_withdrawal_v1", entry_id: newDescriptor.id, modified: newDescriptor.modified },
  };
  if (!newItem) throw new Error("new revision must flip classification or withdraw the entry");
  newItem = { ...newItem, replaces: oldItem.id };
  const kind = newDescriptor.assessment.status === "withdrawn" ? "withdrawal" : "classification_flip";
  const query = kind === "withdrawal" ? literalFromProgram(oldItem.program) : literalFromProgram(newItem.program);
  return { kind, target, oldDescriptor, newDescriptor, oldItem, copyItem, newItem, query, opposite_query: opposite(query) };
}

function latestEntryRevision(state, entryId) {
  const revisions = state.items.filter(item => item.origin?.entry_id === entryId && ["osv_assessment_v1", "osv_withdrawal_v1"].includes(item.origin.kind)).map(item => item.origin.modified);
  return revisions.sort((left, right) => timestampKey(left).localeCompare(timestampKey(right))).at(-1) ?? null;
}

function classifyRedelivery(state, descriptor) {
  const latest = latestEntryRevision(state, descriptor.id);
  if (!latest) return { disposition: "new", latest: null };
  return timestampKey(descriptor.modified) <= timestampKey(latest)
    ? { disposition: "stale_or_duplicate", latest }
    : { disposition: "new", latest };
}

module.exports = { IDEAS, buildEpisode, classifyRedelivery, latestEntryRevision, literalFromProgram, opposite };
