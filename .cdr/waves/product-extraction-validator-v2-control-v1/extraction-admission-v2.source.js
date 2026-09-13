"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { validateExtraction } = require("./memory-store");
const { canonicalJson } = require("./ontology-registry");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const snapshot = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
const REPAIRABLE_DIAGNOSTICS = new Set([
  "invalid_interval",
  "assertion_evidence_not_verbatim",
  "evidence_span_not_verbatim",
  "duplicate_ontology_candidate",
]);

function inspectExtractionCandidateV1(candidate, sourceText) {
  const diagnostics = [];
  try {
    validateExtraction(candidate);
  } catch (error) {
    return [{ code: "schema_invalid", path: "$", message: error.message }];
  }

  candidate.assertions.forEach((assertion, index) => {
    if (candidate.schema_version === "memory-extraction-v2") {
      diagnostics.push({
        code: "legacy_assertion_without_evidence",
        path: `$.assertions[${index}]`,
        message: "product admission requires memory-extraction-v3 evidence on every assertion",
      });
    } else if (!sourceText.includes(assertion.evidence_span)) {
      diagnostics.push({
        code: "assertion_evidence_not_verbatim",
        path: `$.assertions[${index}].evidence_span`,
        message: "assertion evidence_span must be a verbatim substring of the user message",
      });
    }
    if (assertion.valid_from !== null && assertion.valid_to !== null && assertion.valid_from > assertion.valid_to) {
      diagnostics.push({
        code: "invalid_interval",
        path: `$.assertions[${index}]`,
        message: "valid_from must not be later than valid_to",
      });
    }
  });

  const names = new Map();
  candidate.ontology_candidates.forEach((ontologyCandidate, index) => {
    if (!sourceText.includes(ontologyCandidate.evidence_span)) {
      diagnostics.push({
        code: "evidence_span_not_verbatim",
        path: `$.ontology_candidates[${index}].evidence_span`,
        message: "evidence_span must be a verbatim substring of the user message",
      });
    }
    if (names.has(ontologyCandidate.name)) {
      diagnostics.push({
        code: "duplicate_ontology_candidate",
        path: `$.ontology_candidates[${index}].name`,
        message: `ontology candidate ${ontologyCandidate.name} duplicates index ${names.get(ontologyCandidate.name)}`,
      });
    } else {
      names.set(ontologyCandidate.name, index);
    }
  });
  return diagnostics;
}

function inspectExtractionCandidateV2(candidate, sourceText) {
  const diagnostics = inspectExtractionCandidateV1(candidate, sourceText);
  if (diagnostics.some(item => item.code === "schema_invalid")) return diagnostics;
  const pronouns = new Set(["they", "he", "she", "it", "он", "она", "они"]);
  candidate.assertions.forEach((assertion, index) => {
    if (assertion.arguments[0] === "user") return;
    const firstToken = assertion.evidence_span.trim().toLowerCase().match(/^\p{L}+/u)?.[0];
    if (pronouns.has(firstToken)) {
      diagnostics.push({
        code: "unresolved_pronoun_subject",
        path: `$.assertions[${index}].arguments[0]`,
        message: "a third-person pronoun does not ground the normalized subject identity",
      });
    }
  });
  return diagnostics;
}

const inspectExtractionCandidate = inspectExtractionCandidateV2;

function inspectRepairScope(original, repaired, diagnostics) {
  const allowedPaths = new Set();
  for (const diagnostic of diagnostics) {
    if (diagnostic.code === "invalid_interval") {
      const match = /^\$\.assertions\[(\d+)\]$/.exec(diagnostic.path);
      if (match) {
        allowedPaths.add(`$.assertions[${match[1]}].valid_from`);
        allowedPaths.add(`$.assertions[${match[1]}].valid_to`);
      }
    } else if (["assertion_evidence_not_verbatim", "evidence_span_not_verbatim", "duplicate_ontology_candidate"].includes(diagnostic.code)) {
      allowedPaths.add(diagnostic.path);
    }
  }

  const changedPaths = [];
  function compare(left, right, currentPath) {
    if (allowedPaths.has(currentPath)) return;
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        changedPaths.push(currentPath);
        return;
      }
      left.forEach((value, index) => compare(value, right[index], `${currentPath}[${index}]`));
      return;
    }
    if ((left && typeof left === "object") || (right && typeof right === "object")) {
      if (!left || !right || typeof left !== "object" || typeof right !== "object") {
        changedPaths.push(currentPath);
        return;
      }
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      keys.forEach(key => compare(left[key], right[key], `${currentPath}.${key}`));
      return;
    }
    if (left !== right) changedPaths.push(currentPath);
  }
  compare(original, repaired, "$");
  return changedPaths.map(changedPath => ({
    code: "repair_scope_violation",
    path: changedPath,
    message: "repair changed a field that was not named by the validator",
  }));
}

function makeReceipt({ messageId, sourceText, providerIdentity, original, diagnostics, repaired = null, repairedDiagnostics = null, status, error = null }) {
  const body = {
    schema_version: "memory-extraction-admission-receipt-v1",
    source_message_id: messageId,
    source_sha256: sha256(sourceText),
    source_text: sourceText,
    provider_identity: snapshot(providerIdentity),
    original_candidate_sha256: sha256(canonicalJson(original)),
    original_candidate: snapshot(original),
    validator_diagnostics: snapshot(diagnostics),
    repaired_candidate_sha256: repaired ? sha256(canonicalJson(repaired)) : null,
    repaired_candidate: repaired ? snapshot(repaired) : null,
    repaired_validator_diagnostics: repairedDiagnostics === null ? null : snapshot(repairedDiagnostics),
    status,
    error,
  };
  return Object.freeze({ ...body, receipt_sha256: sha256(canonicalJson(body)) });
}

function appendReceipt(file, receipt) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${canonicalJson(receipt)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function processExtractionTurn({
  text,
  messageId,
  provider,
  memory,
  repairEnabled = false,
  auditFile = null,
}) {
  const providerIdentity = {
    name: typeof provider.name === "string" && provider.name ? provider.name : "injected",
    model: typeof provider.model === "string" && provider.model ? provider.model : null,
  };
  const original = snapshot(await provider.extractMemory(text));
  const diagnostics = inspectExtractionCandidate(original, text);
  if (diagnostics.length === 0) {
    const receipt = makeReceipt({
      messageId,
      sourceText: text,
      providerIdentity,
      original,
      diagnostics,
      status: "primary_proposed_unadmitted",
    });
    appendReceipt(auditFile, receipt);
    return {
      admission_status: receipt.status,
      facts: [],
      conflicts: [],
      ontology_candidates: original.ontology_candidates,
      admission_receipt: receipt,
    };
  }

  const repairable = diagnostics.every(diagnostic => REPAIRABLE_DIAGNOSTICS.has(diagnostic.code));
  if (!repairEnabled || !repairable || typeof provider.repairMemory !== "function") {
    const receipt = makeReceipt({
      messageId,
      sourceText: text,
      providerIdentity,
      original,
      diagnostics,
      status: !repairEnabled ? "rejected_primary" : !repairable ? "rejected_primary_unrepairable" : "repair_unavailable",
    });
    appendReceipt(auditFile, receipt);
    return {
      admission_status: receipt.status,
      facts: [],
      conflicts: [],
      ontology_candidates: original && original.ontology_candidates || [],
      admission_receipt: receipt,
    };
  }

  let repaired;
  try {
    repaired = snapshot(await provider.repairMemory(text, snapshot(original), snapshot(diagnostics)));
  } catch (error) {
    const receipt = makeReceipt({
      messageId,
      sourceText: text,
      providerIdentity,
      original,
      diagnostics,
      status: "repair_failed",
      error: error.message,
    });
    appendReceipt(auditFile, receipt);
    return { admission_status: receipt.status, facts: [], conflicts: [], ontology_candidates: original && original.ontology_candidates || [], admission_receipt: receipt };
  }

  const repairedDiagnostics = inspectExtractionCandidate(repaired, text);
  if (repairedDiagnostics.every(diagnostic => diagnostic.code !== "schema_invalid"))
    repairedDiagnostics.push(...inspectRepairScope(original, repaired, diagnostics));
  const receipt = makeReceipt({
    messageId,
    sourceText: text,
    providerIdentity,
    original,
    diagnostics,
    repaired,
    repairedDiagnostics,
    status: repairedDiagnostics.length === 0 ? "repair_proposed_unadmitted" : "repair_rejected",
  });
  appendReceipt(auditFile, receipt);
  return {
    admission_status: receipt.status,
    facts: [],
    conflicts: [],
    ontology_candidates: repaired && repaired.ontology_candidates || [],
    admission_receipt: receipt,
  };
}

function hasAdmissionEvent(file, receiptHash) {
  if (!file || !fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`admission ledger contains malformed JSON: ${error.message}`);
    }
    if (record.schema_version === "memory-extraction-admission-event-v1") {
      const { event_sha256: claimedEventHash, ...eventBody } = record;
      if (sha256(canonicalJson(eventBody)) !== claimedEventHash)
        throw new Error("admission ledger event hash mismatch");
      if (record.receipt_sha256 === receiptHash) return true;
    }
  }
  return false;
}

async function admitExtraction({ receipt, approved, memory, auditFile = null }) {
  if (approved !== true) throw new Error("explicit approval is required to admit an extraction candidate");
  const admissible = new Set(["primary_proposed_unadmitted", "repair_proposed_unadmitted"]);
  if (!receipt || receipt.schema_version !== "memory-extraction-admission-receipt-v1" || !admissible.has(receipt.status))
    throw new Error("receipt does not contain an admissible extraction candidate");
  const { receipt_sha256: claimedReceiptHash, ...body } = receipt;
  if (sha256(canonicalJson(body)) !== claimedReceiptHash) throw new Error("admission receipt hash mismatch");
  if (typeof receipt.source_text !== "string" || sha256(receipt.source_text) !== receipt.source_sha256)
    throw new Error("source text hash mismatch");
  if (sha256(canonicalJson(receipt.original_candidate)) !== receipt.original_candidate_sha256)
    throw new Error("original candidate hash mismatch");
  const isRepair = receipt.status === "repair_proposed_unadmitted";
  const candidate = isRepair ? receipt.repaired_candidate : receipt.original_candidate;
  const candidateHash = isRepair ? receipt.repaired_candidate_sha256 : receipt.original_candidate_sha256;
  const candidateDiagnostics = isRepair ? receipt.repaired_validator_diagnostics : receipt.validator_diagnostics;
  if (sha256(canonicalJson(candidate)) !== candidateHash) throw new Error("selected candidate hash mismatch");
  if (!Array.isArray(candidateDiagnostics) || candidateDiagnostics.length !== 0)
    throw new Error("selected candidate still has validator diagnostics");
  const replayedDiagnostics = inspectExtractionCandidate(candidate, receipt.source_text);
  if (replayedDiagnostics.length !== 0)
    throw new Error(`selected candidate fails admission replay: ${canonicalJson(replayedDiagnostics)}`);
  if (hasAdmissionEvent(auditFile, claimedReceiptHash)) throw new Error("receipt has already been admitted");

  const admitted = await memory.add(snapshot(candidate), receipt.source_message_id);
  const eventBody = {
    schema_version: "memory-extraction-admission-event-v1",
    receipt_sha256: claimedReceiptHash,
    source_message_id: receipt.source_message_id,
    selected_candidate: isRepair ? "repaired" : "primary",
    selected_candidate_sha256: candidateHash,
    assertion_count: candidate.assertions.length,
    ontology_candidates_ignored: candidate.ontology_candidates.length,
    status: "admitted",
  };
  const admissionEvent = Object.freeze({ ...eventBody, event_sha256: sha256(canonicalJson(eventBody)) });
  appendReceipt(auditFile, admissionEvent);
  return { ...admitted, admission_event: admissionEvent };
}

module.exports = {
  admitExtraction,
  appendReceipt,
  inspectExtractionCandidate,
  inspectExtractionCandidateV1,
  inspectExtractionCandidateV2,
  inspectRepairScope,
  makeReceipt,
  processExtractionTurn,
  sha256,
};
