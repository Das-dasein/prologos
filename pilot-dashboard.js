"use strict";

// Build a self-contained pilot dashboard.  The generated HTML embeds the
// dataset, result, and provider raw outputs, so it remains useful after the
// temporary runner directory is gone.
const fs = require("node:fs");
const path = require("node:path");

function arg(name, fallback) {
  const argv = process.argv.slice(2);
  const inline = argv.find(value => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index < 0 ? fallback : argv[index + 1];
}

function readJsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function rawTurn(rawDir, caseId, turn) {
  if (!rawDir) return null;
  const file = path.join(rawDir, `${caseId}-turn-${turn}.json`);
  if (!fs.existsSync(file)) return null;
  const events = readJsonl(file);
  const message = events.find(event => event.type === "item.completed" && event.item && event.item.type === "agent_message");
  const completed = events.find(event => event.type === "turn.completed");
  let output = null;
  try { output = message ? JSON.parse(message.item.text) : null; } catch (_) { output = message ? message.item.text : null; }
  return { output, usage: completed && completed.usage ? completed.usage : null };
}

function safeId(value) { return String(value).replace(/[^a-zA-Z0-9._-]/g, "_"); }
function rawAnswer(rawDir, caseId, condition = "B4") {
  if (!rawDir) return null;
  const file = path.join(rawDir, safeId(caseId), condition, "answer.json");
  if (!fs.existsSync(file)) return null;
  const events = readJsonl(file);
  const message = events.find(event => event.type === "item.completed" && event.item && event.item.type === "agent_message");
  const completed = events.find(event => event.type === "turn.completed");
  return { text: message?.item?.text || null, usage: completed?.usage || null };
}

function buildData(dataset, result, rawDir) {
  const records = new Map((result.records || []).map(record => [record.case_id, record]));
  return dataset.map(item => ({
    case_id: item.case_id,
    category: item.category,
    dialogue: item.dialogue.map((turn, index) => ({ ...turn, turn: index + 1, provider: rawTurn(rawDir, item.case_id, index + 1) })),
    oracle: item.oracle,
    result: records.get(item.case_id) || null,
  }));
}

function html(data, result) {
  const assets = name => fs.readFileSync(path.join(__dirname, "dashboard", name), "utf8");
  const embedded = JSON.stringify({ result, cases: data }).replace(/</g, "\\u003c");
  return assets("template.html")
    .replace("/* STYLES */", () => assets("style.css"))
    .replace("/* DATA */", () => embedded)
    .replace("/* SCRIPT */", () => assets("app.js"));
}

const datasetFile = arg("dataset", ".cdr/datasets/dialogues-pilot-v1.jsonl");
const resultFile = arg("result");
const sourceReport = arg("source-report");
const rawDir = arg("raw-output-dir");
const output = arg("output", "reports/pilot-dashboard.html");
if (!resultFile && !sourceReport) { console.error("Usage: node pilot-dashboard.js --result <pilot-result.json> [--raw-output-dir <dir>] [--dataset <dataset.jsonl>] --output <dashboard.html>\n   or: node pilot-dashboard.js --source-report <existing.html> --output <dashboard.html>"); process.exit(1); }
let result, data;
if (sourceReport) {
  const source = fs.readFileSync(sourceReport, "utf8");
  const match = source.match(/<script id="dashboard-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`dashboard data not found in ${sourceReport}`);
  const embedded = JSON.parse(match[1]);
  result = embedded.result;
  data = embedded.cases;
  if (rawDir) throw new Error("Cannot attach another run to a saved report; use its aggregate instead.");
} else {
  result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  if (result.artifact_kind === "aggregate") {
    const crypto = require("node:crypto");
    const oraclePath = arg("oracle", ".cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json");
    for (const [file, hash] of [[datasetFile, result.dataset_sha256], [oraclePath, result.oracle_sha256]]) {
      if (crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") !== hash) throw new Error("Input hash mismatch: " + file);
    }
    const aggregate = result;
    result = aggregate.conditions.find(e => e.condition === "B4").artifact;
    const oracle = JSON.parse(fs.readFileSync(oraclePath));
    const review = JSON.parse(fs.readFileSync(arg("analysis")));
    const hash = crypto.createHash("sha256").update(fs.readFileSync(resultFile)).digest("hex");
    if (review.aggregate_sha256 !== hash) throw new Error("Analysis belongs to another run");
    result = {...result, review, aggregate_sha256: hash};
    data = readJsonl(datasetFile).map(item => {
      const record = result.records.find(r => r.case_id === item.case_id);
      return {...item, result: record, expected_answer: oracle.cases[item.case_id], analysis: review.cases[item.case_id],
        dialogue: item.dialogue.map((t,i) => ({...t, turn:i+1, provider:{output:record.turn_outputs[i].output}}))};
    });
  } else data = buildData(readJsonl(datasetFile), result, rawDir);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html(data, result));
console.log(`✓ Wrote ${output} (${data.reduce((sum, item) => sum + item.dialogue.length, 0)} turns embedded)`);
