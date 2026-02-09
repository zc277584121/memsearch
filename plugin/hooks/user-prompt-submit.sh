#!/usr/bin/env bash
# UserPromptSubmit hook: semantic search on every user prompt, inject relevant memories.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Extract prompt text from input
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)

# Skip short prompts (greetings, single words, etc.)
if [ -z "$PROMPT" ] || [ "${#PROMPT}" -lt 10 ]; then
  echo '{}'
  exit 0
fi

# Need memsearch for semantic search
if [ -z "$MEMSEARCH_CMD" ]; then
  echo '{}'
  exit 0
fi

# Run semantic search
search_results=$($MEMSEARCH_CMD search "$PROMPT" --top-k 3 --json-output 2>/dev/null || true)

# Check if we got meaningful results
if [ -z "$search_results" ] || [ "$search_results" = "[]" ] || [ "$search_results" = "null" ]; then
  echo '{}'
  exit 0
fi

# Format results as markdown
formatted=$(echo "$search_results" | jq -r '
  .[]? |
  "- [\(.source // "unknown"):\(.heading // "")]  \(.content // "" | .[0:200])"
' 2>/dev/null || true)

if [ -z "$formatted" ]; then
  echo '{}'
  exit 0
fi

context="## Relevant Memories\n$formatted"
json_context=$(printf '%s' "$context" | jq -Rs .)
echo "{\"additionalContext\": $json_context}"
