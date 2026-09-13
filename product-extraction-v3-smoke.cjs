"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ADMISSION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV1 } = require("./extraction-admission");

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
  const text = fs.readFileSync(file, "utf8");
  const fixture = JSON.parse(text);
  const keys = Object.keys(fixture).sort();
  if (canonicalJson(keys) !== canonicalJson(["case_id", "schema_version", "source_text"])) throw new Error("fixture shape mismatch");
  if (fixture.schema_version !== "product-extraction-v3-smoke-fixture-v1" || typeof fixture.case_id !== "string" || typeof fixture.source_text !== "string" || !fixture.source_text)
    throw new Error("invalid fixture");
  return { fixture, text, sha256: sha256(text) };
}

function verifyReport(report) {
  if (!report || report.schema_version !== "product-extraction-v3-smoke-report-v1") throw new Error("report schema mismatch");
  if (sha256(canonicalJson(report.candidate)) !== report.candidate_sha256) throw new Error("candidate hash mismatch");
  if (sha256(report.source_text) !== report.source_sha256) throw new Error("source hash mismatch");
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true });
  if (sha256(canonicalJson(schema)) !== report.extraction_schema_sha256) throw new Error("schema hash mismatch");
  if (sha256(ADMISSION_EXTRACTION_INSTRUCTIONS) !== report.prompt_contract_sha256) throw new Error("prompt contract hash mismatch");
  const diagnostics = inspectExtractionCandidateV1(report.candidate, report.source_text);
  if (canonicalJson(diagnostics) !== canonicalJson(report.validator_diagnostics)) throw new Error("validator replay mismatch");
  if (report.provider_calls !== 1 || report.admission_writes !== 0) throw new Error("smoke boundary mismatch");
  const expectedStatus = diagnostics.length === 0 ? "candidate-valid-unadmitted-v1" : "candidate-rejected-unadmitted-v1";
  if (report.status !== expectedStatus) throw new Error("smoke status mismatch");
  return { status: "verified-product-extraction-v3-smoke-v1", candidate_sha256: report.candidate_sha256 };
}

async function collect({ fixtureFile, model, outputFile }) {
  const fixtureInput = readFixture(fixtureFile);
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("--model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputFile)) throw new Error("output already exists");
  const provider = require("./providers/codex");
  if (provider.model !== model) throw new Error("provider model pin mismatch");
  const candidate = await provider.extractMemory(fixtureInput.fixture.source_text);
  const diagnostics = inspectExtractionCandidateV1(candidate, fixtureInput.fixture.source_text);
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true });
  const report = {
    schema_version: "product-extraction-v3-smoke-report-v1",
    status: diagnostics.length === 0 ? "candidate-valid-unadmitted-v1" : "candidate-rejected-unadmitted-v1",
    case_id: fixtureInput.fixture.case_id,
    source_text: fixtureInput.fixture.source_text,
    source_sha256: sha256(fixtureInput.fixture.source_text),
    fixture_sha256: fixtureInput.sha256,
    provider: provider.name,
    model,
    extraction_schema_sha256: sha256(canonicalJson(schema)),
    prompt_contract_sha256: sha256(ADMISSION_EXTRACTION_INSTRUCTIONS),
    candidate,
    candidate_sha256: sha256(canonicalJson(candidate)),
    validator_diagnostics: diagnostics,
    provider_calls: 1,
    admission_writes: 0,
  };
  const verification = verifyReport(report);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return { report, verification };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) {
    process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
    return;
  }
  if (!args.fixture || !args.model || !args.output) throw new Error("live run requires --fixture, --model, --output and --allow-live-provider");
  const result = await collect({ fixtureFile: path.resolve(args.fixture), model: args.model, outputFile: path.resolve(args.output) });
  process.stdout.write(`${JSON.stringify(result.verification)}\n`);
}

module.exports = { collect, parseArgs, readFixture, verifyReport };

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
