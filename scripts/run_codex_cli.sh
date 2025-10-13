#!/usr/bin/env bash

# Helper wrapper around Codex CLI so composite actions share a single entry point.
# Arguments:
#   1. Model id (e.g. gpt-5-codex)
#   2. Prompt file path
#   3. Output file path
#   4. Review mode (light|deep|docs|issue)
#   5+. Extra flags passed directly to Codex CLI
set -euo pipefail

MODEL=${1:-}
PROMPT_FILE=${2:-}
OUTPUT_FILE=${3:-}
MODE=${4:-}
shift 4 || true

if [[ -z "${MODEL}" || -z "${PROMPT_FILE}" || -z "${OUTPUT_FILE}" || -z "${MODE}" ]]; then
  echo "Usage: $0 <model> <prompt-file> <output-file> <mode> [extra args]" >&2
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI (codex) not found on PATH. Install via setup-codex-cli composite action." >&2
  exit 3
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

codex exec \
  --model "${MODEL}" \
  --prompt-file "${PROMPT_FILE}" \
  --mode "${MODE}" \
  --output "${OUTPUT_FILE}" \
  "$@"

echo "Codex CLI wrote report to ${OUTPUT_FILE}"
