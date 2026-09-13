"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { ACTIVE_EXTRACTION_ADMISSION_POLICY } = require("./extraction-admission-policy");
const { PolicyDecisionExtraction, POLICY_DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { processExtractionTurn, sha256: admissionSha256 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function parseArgs(argv) {
  const result = { allowLiveProvider: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") result.allowLiveProvider = true;
    else if (["--fixture", "--model", "--output"].includes(token)) result[token.slice(2)] = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return result;
}

function readFixture(file) {
  const bytes = fs.readFileSync(file);
  const fixture = JSON.parse(bytes);
  if (fixture.schema_version !== "product-extraction-v5-product-smoke-fixture-v1") throw new Error("fixture schema mismatch");
  if (canonicalJson(fixture.ontology_identity) !== canonicalJson(ACTIVE_ONTOLOGY.identity)) throw new Error("fixture ontology identity mismatch");
  if (canonicalJson(fixture.grounding_policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("fixture grounding policy identity mismatch");
  if (canonicalJson(fixture.admission_policy_identity) !== canonicalJson(ACTIVE_EXTRACTION_ADMISSION_POLICY.identity)) throw new Error("fixture admission policy identity mismatch");
  return { fixture, bytes, sha256: sha256(bytes) };
}

function readControl(file) {
  const control = JSON.parse(fs.readFileSync(file, "utf8"));
  if (control.schema_version !== "product-extraction-v5-product-smoke-control-v1") throw new Error("control schema mismatch");
  if (control.provider_calls !== 1 || control.admission_writes !== 0) throw new Error("unsupported smoke control");
  return control;
}

function verifyReceipt(receipt, fixture) {
  const { receipt_sha256: claimed, ...body } = receipt;
  if (admissionSha256(canonicalJson(body)) !== claimed) throw new Error("receipt hash mismatch");
  if (receipt.schema_version !== "memory-extraction-admission-receipt-v2") throw new Error("receipt schema mismatch");
  if (canonicalJson(receipt.admission_policy_identity) !== canonicalJson(ACTIVE_EXTRACTION_ADMISSION_POLICY.identity)) throw new Error("receipt policy mismatch");
  if (receipt.source_text !== fixture.source_text || receipt.source_sha256 !== admissionSha256(fixture.source_text)) throw new Error("receipt source mismatch");
  if (receipt.status !== "primary_proposed_unadmitted") throw new Error("candidate was not quarantined");
}

function verifyReport(report, fixtureFile, controlFile = path.join(path.dirname(fixtureFile), "control.json")) {
  const input = readFixture(fixtureFile);
  const fixture = input.fixture;
  const control = readControl(controlFile);
  if (control.fixture_sha256 !== input.sha256 || control.fixture_semantic_sha256 !== sha256(canonicalJson(fixture))) throw new Error("control fixture binding mismatch");
  if (report.schema_version !== "product-extraction-v5-product-smoke-report-v1") throw new Error("report schema mismatch");
  if (report.fixture_sha256 !== input.sha256) throw new Error("fixture hash mismatch");
  if (report.provider !== "codex" || typeof report.model !== "string" || !report.model) throw new Error("provider identity mismatch");
  if (report.provider_calls !== control.provider_calls || report.admission_writes !== control.admission_writes) throw new Error("smoke boundary mismatch");
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v5", assertionEvidence: true, decisionContract: true, groundingPolicy: ACTIVE_GROUNDING_POLICY });
  if (report.extraction_schema_sha256 !== sha256(canonicalJson(schema))) throw new Error("schema hash mismatch");
  if (report.prompt_contract_sha256 !== sha256(POLICY_DECISION_EXTRACTION_INSTRUCTIONS)) throw new Error("prompt hash mismatch");
  const candidate = PolicyDecisionExtraction.parse(report.candidate);
  if (report.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("candidate hash mismatch");
  if (candidate.decision !== "write" || candidate.assertions.length !== 1) throw new Error("unexpected extraction decision");
  const assertion = candidate.assertions[0];
  if (assertion.relation !== fixture.expected_relation || canonicalJson(assertion.arguments) !== canonicalJson(fixture.expected_arguments)) throw new Error("unexpected extracted assertion");
  if (!fixture.source_text.includes(assertion.evidence_span)) throw new Error("assertion evidence is not verbatim");
  verifyReceipt(report.admission_receipt, fixture);
  return { status: "verified-product-extraction-v5-product-smoke-v1", decision: candidate.decision, admission_status: report.admission_receipt.status };
}

async function collect({ fixtureFile, model, outputFile }) {
  const input = readFixture(fixtureFile);
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("--model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputFile)) throw new Error("output already exists");
  const provider = require("./providers/codex");
  const candidate = await provider.extractMemory(input.fixture.source_text);
  const writes = [];
  const memory = {
    read: () => "% smoke memory\n",
    async add(value) { writes.push(value); throw new Error("smoke must not write memory"); },
  };
  const result = await processExtractionTurn({
    text: input.fixture.source_text,
    messageId: "m_product_v5_smoke_01",
    provider: { name: provider.name, model: provider.model, extractMemory: async () => candidate },
    memory,
    repairEnabled: false,
    auditFile: null,
  });
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v5", assertionEvidence: true, decisionContract: true, groundingPolicy: ACTIVE_GROUNDING_POLICY });
  const report = {
    schema_version: "product-extraction-v5-product-smoke-report-v1",
    fixture_sha256: input.sha256,
    provider: provider.name,
    model,
    extraction_schema_sha256: sha256(canonicalJson(schema)),
    prompt_contract_sha256: sha256(POLICY_DECISION_EXTRACTION_INSTRUCTIONS),
    candidate,
    candidate_sha256: sha256(canonicalJson(candidate)),
    admission_receipt: result.admission_receipt,
    provider_calls: 1,
    admission_writes: writes.length,
  };
  const verified = verifyReport(report, fixtureFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true, mode: 0o700 });
  fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return verified;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0 })}\n`);
  if (!args.fixture || !args.model || !args.output) throw new Error("live run requires fixture, model, output, and --allow-live-provider");
  process.stdout.write(`${JSON.stringify(await collect({ fixtureFile: path.resolve(args.fixture), model: args.model, outputFile: path.resolve(args.output) }))}\n`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { collect, parseArgs, readControl, readFixture, verifyReport };
