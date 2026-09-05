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
const rawDir = arg("raw-output-dir");
const output = arg("output", "reports/pilot-dashboard.html");
if (!resultFile) { console.error("Usage: node pilot-dashboard.js --result <pilot-result.json> [--raw-output-dir <dir>] [--dataset <dataset.jsonl>] --output <dashboard.html>"); process.exit(1); }
const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
const data = buildData(readJsonl(datasetFile), result, rawDir);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html(data, result));
console.log(`✓ Wrote ${output} (${data.reduce((sum, item) => sum + item.dialogue.length, 0)} turns embedded)`);
