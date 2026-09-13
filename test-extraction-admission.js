"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_EXTRACTION_ADMISSION_POLICY, EXTRACTION_ADMISSION_POLICY_V1 } = require("./extraction-admission-policy");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { EvidenceExtraction, DecisionExtraction, PolicyDecisionExtraction, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { turn } = require("./chat");
const {
  admitExtraction,
  inspectExtractionCandidate,
  inspectExtractionCandidateV3,
  processExtractionTurn,
} = require("./extraction-admission");

const extraction = ({ assertions = [], ontologyCandidates = [] } = {}) => ({
  schema_version: "memory-extraction-v3",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  assertions,
  ontology_candidates: ontologyCandidates,
});

const decisionExtraction = ({ decision, assertions = [], ontologyCandidates = [], clarification = null }) => ({
  schema_version: "memory-extraction-v4",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  decision,
  clarification,
  assertions,
  ontology_candidates: ontologyCandidates,
});

const policyDecisionExtraction = ({ decision, assertions = [], ontologyCandidates = [], clarification = null }) => ({
  ...decisionExtraction({ decision, assertions, ontologyCandidates, clarification }),
  schema_version: "memory-extraction-v5",
  policy_identity: ACTIVE_GROUNDING_POLICY.identity,
});

const assertion = overrides => ({
  polarity: "positive",
  relation: "knows_technology",
  arguments: ["user", "prolog"],
  valid_from: null,
  valid_to: null,
  confidence: 0.9,
  evidence_span: "I enjoy logic programming",
  ...overrides,
});

const ontologyCandidate = evidenceSpan => ({
  name: "enjoys_logic_programming",
  arity: 1,
  argument_types: ["person"],
  meaning: "A person enjoys logic programming",
  evidence_span: evidenceSpan,
});

function fakeMemory() {
  const writes = [];
  return {
    writes,
    read() { return "% test memory\n"; },
    async add(candidate, messageId) {
      writes.push({ candidate, messageId });
      return { facts: candidate.assertions.map((_, index) => ({ text: `fact-${index}` })), conflicts: [], ontology_candidates: candidate.ontology_candidates };
    },
  };
}

(async () => {
  const source = "I enjoy logic programming.";
  const clean = extraction({ assertions: [assertion()] });
  assert.deepEqual(EvidenceExtraction.parse(clean), clean);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(__dirname, "schemas", "memory-extraction-v3.schema.json"), "utf8")),
    createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true }),
  );
  assert.deepEqual(inspectExtractionCandidate(clean, source), []);
  const writeDecision = decisionExtraction({ decision: "write", assertions: [assertion()] });
  assert.deepEqual(DecisionExtraction.parse(writeDecision), writeDecision);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(__dirname, "schemas", "memory-extraction-v4.schema.json"), "utf8")),
    createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v4", assertionEvidence: true, decisionContract: true }),
  );
  assert.throws(() => DecisionExtraction.parse(decisionExtraction({ decision: "ignore", assertions: [assertion()] })));
  assert.throws(() => DecisionExtraction.parse(decisionExtraction({ decision: "clarify" })));
  const legacy = { ...clean, schema_version: "memory-extraction-v2", assertions: clean.assertions.map(({ evidence_span: _span, ...item }) => item) };
  assert.equal(inspectExtractionCandidate(legacy, source)[0].code, "legacy_assertion_without_evidence");
  assert.equal(inspectExtractionCandidate(extraction({ assertions: [assertion({ evidence_span: "not in source" })] }), source)[0].code, "assertion_evidence_not_verbatim");
  const pronounCandidate = extraction({ assertions: [assertion({ arguments: ["alex", "python"], relation: "uses", evidence_span: "They use Python." })] });
  assert(inspectExtractionCandidate(pronounCandidate, "They use Python.").some(item => item.code === "unresolved_pronoun_subject"));
  const clearPronounCandidate = extraction({ assertions: [assertion({ arguments: ["alex", "python"], relation: "uses", evidence_span: "He uses Python." })] });
  assert(inspectExtractionCandidate(clearPronounCandidate, "Alex joined the project. He uses Python.").some(item => item.code === "unresolved_pronoun_subject"));
  assert.equal(inspectExtractionCandidateV3(clearPronounCandidate, "Alex joined the project. He uses Python.").length, 0);
  assert(inspectExtractionCandidateV3(clearPronounCandidate, "Alex met Jordan. He uses Python.").some(item => item.code === "ambiguous_pronoun_subject"));
  const clearRussianPronoun = extraction({ assertions: [assertion({ arguments: ["ilya", "java"], evidence_span: "Он знает Java." })] });
  assert.equal(inspectExtractionCandidateV3(clearRussianPronoun, "Илья сегодня с нами. Он знает Java.").length, 0);
  assert.equal(inspectExtractionCandidate(extraction({ assertions: [assertion({ arguments: ["alex", "python"], relation: "uses", evidence_span: "Alex uses Python." })] }), "Alex uses Python.").length, 0);
  assert.equal(inspectExtractionCandidate(extraction({ assertions: [assertion({ valid_from: 20260102, valid_to: 20260101 })] }), source)[0].code, "invalid_interval");

  const directMemory = fakeMemory();
  let directRepairCalls = 0;
  const direct = await processExtractionTurn({
    text: source,
    messageId: "m_direct",
    provider: { name: "fake-provider", model: "fake-model-v1", extractMemory: async () => clean, repairMemory: async () => { directRepairCalls += 1; return clean; } },
    memory: directMemory,
    repairEnabled: true,
  });
  assert.equal(direct.admission_status, "primary_proposed_unadmitted");
  assert.equal(directMemory.writes.length, 0);
  assert.equal(directRepairCalls, 0);
  assert.deepEqual(direct.admission_receipt.provider_identity, { name: "fake-provider", model: "fake-model-v1" });
  assert.equal(direct.admission_receipt.schema_version, "memory-extraction-admission-receipt-v1");
  await assert.rejects(() => admitExtraction({ receipt: direct.admission_receipt, approved: false, memory: directMemory }), /explicit approval/);
  await admitExtraction({ receipt: direct.admission_receipt, approved: true, memory: directMemory });
  assert.equal(directMemory.writes.length, 1);

  const v4Memory = fakeMemory();
  const v4Write = await processExtractionTurn({
    text: source,
    messageId: "m_v4_write",
    provider: { extractMemory: async () => writeDecision },
    memory: v4Memory,
  });
  assert.equal(v4Write.admission_status, "primary_proposed_unadmitted");
  assert.equal(v4Write.admission_receipt.schema_version, "memory-extraction-admission-receipt-v2");
  assert.deepEqual(v4Write.admission_receipt.admission_policy_identity, EXTRACTION_ADMISSION_POLICY_V1.identity);
  await admitExtraction({ receipt: v4Write.admission_receipt, approved: true, memory: v4Memory });
  assert.equal(v4Memory.writes.length, 1);
  assert.equal(v4Memory.writes[0].candidate.decision, "write");

  const v5Candidate = policyDecisionExtraction({ decision: "write", assertions: [assertion()] });
  assert.deepEqual(PolicyDecisionExtraction.parse(v5Candidate), v5Candidate);
  const v5Memory = fakeMemory();
  const v5Write = await processExtractionTurn({ text: source, messageId: "m_v5_write", provider: { extractMemory: async () => v5Candidate }, memory: v5Memory });
  assert.equal(v5Write.admission_receipt.schema_version, "memory-extraction-admission-receipt-v2");
  assert.deepEqual(v5Write.admission_receipt.admission_policy_identity, ACTIVE_EXTRACTION_ADMISSION_POLICY.identity);
  await admitExtraction({ receipt: v5Write.admission_receipt, approved: true, memory: v5Memory });
  assert.equal(v5Memory.writes.length, 1);

  const legacyReceipt = direct.admission_receipt;
  const legacyMemory = fakeMemory();
  await admitExtraction({ receipt: legacyReceipt, approved: true, memory: legacyMemory });
  assert.equal(legacyMemory.writes.length, 1, "receipt v1 must retain legacy validator-v2 replay");

  const tamperedBody = JSON.parse(JSON.stringify(v4Write.admission_receipt));
  delete tamperedBody.receipt_sha256;
  tamperedBody.admission_policy_identity.sha256 = "0".repeat(64);
  const tamperedReceipt = { ...tamperedBody, receipt_sha256: crypto.createHash("sha256").update(canonicalJson(tamperedBody)).digest("hex") };
  await assert.rejects(() => admitExtraction({ receipt: tamperedReceipt, approved: true, memory: fakeMemory() }), /admission policy identity mismatch/);

  const identitySource = "Я работаю в Кэндзи.";
  const identityCandidate = decisionExtraction({ decision: "write", assertions: [assertion({ relation: "works_at", arguments: ["user", "kendzi"], evidence_span: identitySource })] });
  const identityMemory = fakeMemory();
  const identityResult = await processExtractionTurn({ text: identitySource, messageId: "m_identity", provider: { extractMemory: async () => identityCandidate }, memory: identityMemory });
  assert.equal(identityResult.admission_status, "clarification_required");
  assert.equal(identityResult.admission_receipt.validator_diagnostics[0].code, "unadmitted_non_ascii_identity");
  assert.match(identityResult.clarification_question, /латинское имя/);
  assert.equal(identityMemory.writes.length, 0);

  const explicitClarification = await processExtractionTurn({
    text: "Alex met Jordan. He uses Python.",
    messageId: "m_v4_clarify",
    provider: { extractMemory: async () => decisionExtraction({
      decision: "clarify",
      clarification: { question: "Who does 'He' refer to?", evidence_span: "He uses Python." },
    }) },
    memory: fakeMemory(),
  });
  assert.equal(explicitClarification.admission_status, "clarification_required");
  assert.equal(explicitClarification.clarification_question, "Who does 'He' refer to?");
  await assert.rejects(() => admitExtraction({ receipt: explicitClarification.admission_receipt, approved: true, memory: fakeMemory() }), /admissible extraction candidate/);

  const ignored = await processExtractionTurn({
    text: "Do I know Python?",
    messageId: "m_v4_ignore",
    provider: { extractMemory: async () => decisionExtraction({ decision: "ignore" }) },
    memory: fakeMemory(),
  });
  assert.equal(ignored.admission_status, "ignored");

  const ontologyOnly = await processExtractionTurn({
    text: source,
    messageId: "m_v4_ontology",
    provider: { extractMemory: async () => decisionExtraction({ decision: "ontology_candidate", ontologyCandidates: [ontologyCandidate(source)] }) },
    memory: fakeMemory(),
  });
  assert.equal(ontologyOnly.admission_status, "ontology_candidate_proposed");
  assert.equal(ontologyOnly.ontology_candidates.length, 1);

  const original = extraction({ ontologyCandidates: [ontologyCandidate("logic programming is always fun")] });
  const repaired = extraction({ ontologyCandidates: [ontologyCandidate("enjoy logic programming")] });
  const repairedMemory = fakeMemory();
  const auditFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-extraction-admission-")), "receipts.jsonl");
  let repairCalls = 0;
  const proposal = await processExtractionTurn({
    text: source,
    messageId: "m_repair",
    provider: { extractMemory: async () => original, repairMemory: async () => { repairCalls += 1; return repaired; } },
    memory: repairedMemory,
    repairEnabled: true,
    auditFile,
  });
  assert.equal(proposal.admission_status, "repair_proposed_unadmitted");
  assert.equal(repairCalls, 1);
  assert.equal(repairedMemory.writes.length, 0, "a validated repair must remain unadmitted");
  assert.equal(fs.readFileSync(auditFile, "utf8").trim().split("\n").length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(auditFile, "utf8")).original_candidate, original);

  await assert.rejects(() => admitExtraction({ receipt: proposal.admission_receipt, approved: false, memory: repairedMemory }), /explicit approval/);
  const admitted = await admitExtraction({ receipt: proposal.admission_receipt, approved: true, memory: repairedMemory, auditFile });
  assert.equal(admitted.facts.length, 0);
  assert.equal(repairedMemory.writes.length, 1);
  assert.deepEqual(repairedMemory.writes[0].candidate, repaired);
  assert.equal(fs.readFileSync(auditFile, "utf8").trim().split("\n").length, 2);
  await assert.rejects(
    () => admitExtraction({ receipt: proposal.admission_receipt, approved: true, memory: repairedMemory, auditFile }),
    /already been admitted/,
  );
  const brokenLedger = path.join(path.dirname(auditFile), "broken.jsonl");
  fs.writeFileSync(brokenLedger, "{broken\n", "utf8");
  await assert.rejects(
    () => admitExtraction({ receipt: proposal.admission_receipt, approved: true, memory: fakeMemory(), auditFile: brokenLedger }),
    /malformed JSON/,
  );

  const tampered = JSON.parse(JSON.stringify(proposal.admission_receipt));
  tampered.repaired_candidate.ontology_candidates[0].evidence_span = "tampered";
  await assert.rejects(() => admitExtraction({ receipt: tampered, approved: true, memory: fakeMemory() }), /admission receipt hash mismatch/);

  const badRepairMemory = fakeMemory();
  const badRepair = await processExtractionTurn({
    text: source,
    messageId: "m_bad_repair",
    provider: { extractMemory: async () => original, repairMemory: async () => original },
    memory: badRepairMemory,
    repairEnabled: true,
  });
  assert.equal(badRepair.admission_status, "repair_rejected");
  assert.equal(badRepairMemory.writes.length, 0);

  const outOfScope = extraction({ ontologyCandidates: [{ ...ontologyCandidate("enjoy logic programming"), meaning: "Changed without validator authority" }] });
  const outOfScopeResult = await processExtractionTurn({
    text: source,
    messageId: "m_scope",
    provider: { extractMemory: async () => original, repairMemory: async () => outOfScope },
    memory: fakeMemory(),
    repairEnabled: true,
  });
  assert.equal(outOfScopeResult.admission_status, "repair_rejected");
  assert(outOfScopeResult.admission_receipt.repaired_validator_diagnostics.some(item => item.code === "repair_scope_violation"));

  let ambiguousRepairCalls = 0;
  const ambiguousMemory = fakeMemory();
  const ambiguous = await processExtractionTurn({
    text: "They use Python.",
    messageId: "m_ambiguous",
    provider: { extractMemory: async () => pronounCandidate, repairMemory: async () => { ambiguousRepairCalls += 1; return pronounCandidate; } },
    memory: ambiguousMemory,
    repairEnabled: true,
  });
  assert.equal(ambiguous.admission_status, "clarification_required");
  assert.match(ambiguous.clarification_question, /clarify which person/);
  assert.equal(ambiguousRepairCalls, 0);
  assert.equal(ambiguousMemory.writes.length, 0);
  let responseCalls = 0;
  const chatResult = await turn("They use Python.", {
    provider: {
      extractMemory: async () => pronounCandidate,
      repairMemory: async () => pronounCandidate,
      respond: async () => { responseCalls += 1; return "should not be called"; },
    },
    memory: fakeMemory(),
    repairEnabled: true,
    auditFile: null,
  });
  assert.equal(chatResult.admission_status, "clarification_required");
  assert.match(chatResult.reply, /clarify which person/);
  assert.equal(responseCalls, 0);

  const disabledMemory = fakeMemory();
  const disabled = await processExtractionTurn({
    text: source,
    messageId: "m_disabled",
    provider: { extractMemory: async () => original },
    memory: disabledMemory,
  });
  assert.equal(disabled.admission_status, "rejected_primary");
  assert.equal(disabledMemory.writes.length, 0);

  let schemaRepairCalls = 0;
  const schemaRejected = await processExtractionTurn({
    text: source,
    messageId: "m_schema",
    provider: { extractMemory: async () => undefined, repairMemory: async () => { schemaRepairCalls += 1; return clean; } },
    memory: fakeMemory(),
    repairEnabled: true,
  });
  assert.equal(schemaRejected.admission_status, "rejected_primary_unrepairable");
  assert.equal(schemaRepairCalls, 0);

  const cliRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pam-extraction-cli-"));
  const cliMemory = path.join(cliRoot, "memory.pl");
  const cliAudit = path.join(cliRoot, "repair.jsonl");
  const cli = spawn(process.execPath, [path.join(__dirname, "chat.js")], {
    cwd: __dirname,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      CODEX_BIN: path.join(__dirname, "test-fixtures", "fake-codex.js"),
      MEMORY_FILE: cliMemory,
      MEMORY_REPAIR: "1",
      MEMORY_ADMISSION_AUDIT_FILE: cliAudit,
    },
  });
  let cliOutput = "";
  let cliError = "";
  cli.stdout.on("data", chunk => { cliOutput += chunk; });
  cli.stderr.on("data", chunk => { cliError += chunk; });
  const cliClosed = new Promise((resolve, reject) => {
    cli.once("error", reject);
    cli.once("close", resolve);
  });
  const waitFor = (pattern, start = 0) => new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`CLI output timeout for ${pattern}: ${cliOutput}\n${cliError}`)), 5000);
    const inspect = () => {
      if (pattern.test(cliOutput.slice(start))) {
        clearTimeout(deadline);
        cli.stdout.off("data", inspect);
        resolve(cliOutput.length);
      }
    };
    cli.stdout.on("data", inspect);
    inspect();
  });
  let cursor = await waitFor(/you> /);
  cli.stdin.write("repair interval\n");
  cursor = await waitFor(/repair_proposed_unadmitted/, cursor);
  cli.stdin.write("/candidate\n");
  cursor = await waitFor(/"status": "repair_proposed_unadmitted"/, cursor);
  assert.doesNotMatch(fs.readFileSync(cliMemory, "utf8"), /knows_technology\(user,prolog\)/);
  cli.stdin.write("/admit\n");
  cursor = await waitFor(/admitted 1 assertion\(s\)/, cursor);
  assert.match(fs.readFileSync(cliMemory, "utf8"), /knows_technology\(user,prolog\)/);
  cli.stdin.write("Я знаю Python\n");
  cursor = await waitFor(/primary_proposed_unadmitted/, cursor);
  assert.doesNotMatch(fs.readFileSync(cliMemory, "utf8"), /knows_technology\(user,python\)/);
  cli.stdin.write("/candidate\n");
  cursor = await waitFor(/"status": "primary_proposed_unadmitted"/, cursor);
  cli.stdin.write("/admit\n");
  cursor = await waitFor(/admitted 1 assertion\(s\)/, cursor);
  cli.stdin.write("/exit\n");
  const cliStatus = await cliClosed;
  assert.equal(cliStatus, 0, cliError);
  assert.match(cliOutput, /repair_proposed_unadmitted/);
  assert.match(cliOutput, /"status": "repair_proposed_unadmitted"/);
  assert.match(cliOutput, /"status": "primary_proposed_unadmitted"/);
  assert.match(cliOutput, /admitted 1 assertion\(s\)/);
  assert.match(fs.readFileSync(cliMemory, "utf8"), /knows_technology\(user,prolog\)/);
  assert.match(fs.readFileSync(cliMemory, "utf8"), /knows_technology\(user,python\)/);
  const auditRecords = fs.readFileSync(cliAudit, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(auditRecords[0].status, "repair_proposed_unadmitted");
  assert.equal(auditRecords[1].schema_version, "memory-extraction-admission-event-v1");
  assert.equal(auditRecords[1].status, "admitted");
  assert.equal(auditRecords[2].status, "primary_proposed_unadmitted");
  assert.equal(auditRecords[3].selected_candidate, "primary");

  console.log("extraction admission ok: primary and repaired candidates require explicit approval");
})().catch(error => { console.error(error); process.exitCode = 1; });
