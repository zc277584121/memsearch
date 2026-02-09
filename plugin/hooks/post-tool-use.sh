#!/usr/bin/env bash
# PostToolUse hook (async): auto-index when markdown files in memory dir are modified.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only proceed if it's a .md file under the memory directory
if [ -z "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

# Check if file ends with .md
case "$FILE_PATH" in
  *.md) ;;
  *) echo '{}'; exit 0 ;;
esac

# Resolve to absolute path for comparison
ABS_FILE=$(realpath "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
ABS_MEMORY=$(realpath "$MEMORY_DIR" 2>/dev/null || echo "$MEMORY_DIR")

# Check if file is under the memory directory
case "$ABS_FILE" in
  "$ABS_MEMORY"/*) ;;
  *) echo '{}'; exit 0 ;;
esac

# Index the memory directory
run_memsearch index "$MEMORY_DIR"

echo '{}'
