#!/usr/bin/env bash
# SessionEnd hook: final memsearch index sync.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

if [ -d "$MEMORY_DIR" ]; then
  run_memsearch index "$MEMORY_DIR"
fi

exit 0
