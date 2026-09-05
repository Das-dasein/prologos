#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_NAME="${1:-gpt-5.6-luna}"
RUN_DIR="${2:-/tmp/prologos-live-$(date +%Y%m%d-%H%M%S)}"

if [[ "$MODEL_NAME" == "-h" || "$MODEL_NAME" == "--help" ]]; then
  echo "Usage: $0 [MODEL] [OUTPUT_DIR]"
  echo "Example: $0 gpt-5.6-luna /tmp/prologos-live-run"
  exit 0
fi

CONFIG_SOURCE="$ROOT_DIR/.cdr/results/prolog-memory-eval-v0/pilot-config-v2.json"
DATASET_SOURCE="$ROOT_DIR/.cdr/datasets/dialogues-pilot-v1.jsonl"
ORACLE_SOURCE="$ROOT_DIR/.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json"

command -v node >/dev/null || { echo "node is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
command -v codex >/dev/null || { echo "codex is required" >&2; exit 1; }

if ! codex login status >/dev/null 2>&1; then
  echo "Codex is not authenticated. Run: codex login" >&2
  exit 1
fi

mkdir -p "$RUN_DIR/raw"
jq --arg model "$MODEL_NAME" '.provider = "codex" | .model = $model' \
  "$CONFIG_SOURCE" > "$RUN_DIR/config.json"

echo "Running live B1-B4 pilot with model: $MODEL_NAME"
echo "Artifacts: $RUN_DIR"

(
  cd "$ROOT_DIR"
  node pilot-runner.js \
    --condition all \
    --config "$RUN_DIR/config.json" \
    --dataset "$DATASET_SOURCE" \
    --oracle "$ORACLE_SOURCE" \
    --output "$RUN_DIR/aggregate.json" \
    --allow-live-provider=true \
    --raw-output-dir "$RUN_DIR/raw"
  node cdr-matrix-harness.js --candidate "$RUN_DIR/aggregate.json"
)

echo
echo "Summary:"
jq '{source_commit, model, evidence_boundary, conditions: [.conditions[] | {condition, case_count, matrixB, budget}]}' \
  "$RUN_DIR/aggregate.json"
echo
echo "Raw outputs: $RUN_DIR/raw"
echo "Aggregate:   $RUN_DIR/aggregate.json"
