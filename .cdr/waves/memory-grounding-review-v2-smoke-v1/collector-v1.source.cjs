"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const {
  GroundingReviewV2,
  GROUNDING_REVIEW_V2_INSTRUCTIONS,
  buildGroundingReviewV2Prompt,
  createGroundingReviewV2JsonSchema,
  inspectGroundingReviewV2,
} = require("./grounding-review");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

function loadFixture(file) {
  const bytes = fs.readFileSync(file);
  const fixture = JSON.parse(bytes);
  if (fixture.schema_version !== "memory-grounding-review-v2-smoke-fixture-v1" || fixture.case_id !== "role-verb-01" || fixture.expected_verdict !== "entailed" || fixture.candidate.assertions.length !== 1) throw new Error("invalid review-v2 smoke fixture");
  return { fixture, sha256: sha256(bytes) };
}

function verifyReport(report, fixtureInput) {
  const { fixture } = fixtureInput;
  if (!report || report.schema_version !== "memory-grounding-review-v2-smoke-report-v1" || report.fixture_sha256 !== fixtureInput.sha256 || report.provider_calls !== 1 || report.memory_writes !== 0) throw new Error("review-v2 smoke report mismatch");
  if (report.prompt_sha256 !== sha256(buildGroundingReviewV2Prompt(fixture.source_text, fixture.candidate)) || report.prompt_contract_sha256 !== sha256(GROUNDING_REVIEW_V2_INSTRUCTIONS) || report.schema_sha256 !== sha256(canonicalJson(createGroundingReviewV2JsonSchema()))) throw new Error("review-v2 smoke contract mismatch");
  const review = GroundingReviewV2.parse(report.review);
  const diagnostics = inspectGroundingReviewV2(review, fixture.source_text, fixture.candidate);
  if (canonicalJson(diagnostics) !== canonicalJson(report.diagnostics) || review.reviews[0].verdict !== report.actual_verdict) throw new Error("review-v2 smoke replay mismatch");
  return { status: "verified-memory-grounding-review-v2-smoke-v1", expected: fixture.expected_verdict, actual: report.actual_verdict, diagnostics: diagnostics.length };
}

async function collect({ fixtureFile, model, outputRoot, invoke }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot)) throw new Error("output root already exists");
  const fixtureInput = loadFixture(fixtureFile);
  const { fixture } = fixtureInput;
  const prompt = buildGroundingReviewV2Prompt(fixture.source_text, fixture.candidate);
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const promptFile = path.join(outputRoot, "prompt.txt");
  fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
  const response = await provider(prompt, { schema: path.resolve("schemas/memory-grounding-review-v2.schema.json"), model });
  const stdoutFile = path.join(outputRoot, "stdout.jsonl");
  const stderrFile = path.join(outputRoot, "stderr.txt");
  fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
  const review = GroundingReviewV2.parse(JSON.parse(response.output_text));
  const diagnostics = inspectGroundingReviewV2(review, fixture.source_text, fixture.candidate);
  const report = {
    schema_version: "memory-grounding-review-v2-smoke-report-v1",
    fixture_sha256: fixtureInput.sha256,
    provider: "codex",
    model,
    prompt_sha256: sha256(prompt),
    prompt_contract_sha256: sha256(GROUNDING_REVIEW_V2_INSTRUCTIONS),
    schema_sha256: sha256(canonicalJson(createGroundingReviewV2JsonSchema())),
    review,
    review_sha256: sha256(canonicalJson(review)),
    diagnostics,
    actual_verdict: review.reviews[0].verdict,
    usage: response.usage,
    provider_calls: 1,
    memory_writes: 0,
    raw: { prompt: artifact(outputRoot, promptFile), stdout: artifact(outputRoot, stdoutFile), stderr: artifact(outputRoot, stderrFile) },
  };
  verifyReport(report, fixtureInput);
  fs.writeFileSync(path.join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return report;
}

function parseArgs(argv) {
  const parsed = { allowLiveProvider: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") parsed.allowLiveProvider = true;
    else if (["--fixture", "--model", "--output-root"].includes(token)) parsed[token.slice(2).replaceAll("-", "_")] = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return parsed;
}

module.exports = { collect, loadFixture, verifyReport };
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, memory_writes: 0 })}\n`);
  if (!args.fixture || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), model: args.model, outputRoot: path.resolve(args.output_root) });
  process.stdout.write(`${JSON.stringify({ status: "complete-unadmitted-v1", expected: "entailed", actual: report.actual_verdict, diagnostics: report.diagnostics.length })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
