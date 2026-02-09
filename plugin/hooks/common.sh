#!/usr/bin/env bash
# Shared setup for memsearch command hooks.
# Sourced by all hook scripts — not executed directly.

set -euo pipefail

# Read stdin JSON into $INPUT
INPUT="$(cat)"

# Memory directory is project-scoped
MEMORY_DIR="${CLAUDE_PROJECT_DIR:-.}/.memsearch/memory"

# Find memsearch binary: prefer PATH, fallback to uv run
MEMSEARCH_CMD=""
if command -v memsearch &>/dev/null; then
  MEMSEARCH_CMD="memsearch"
elif command -v uv &>/dev/null; then
  MEMSEARCH_CMD="uv run memsearch"
fi

# Helper: ensure memory directory exists
ensure_memory_dir() {
  mkdir -p "$MEMORY_DIR"
}

# Helper: run memsearch with arguments, silently fail if not available
run_memsearch() {
  if [ -n "$MEMSEARCH_CMD" ]; then
    $MEMSEARCH_CMD "$@" 2>/dev/null || true
  fi
}
