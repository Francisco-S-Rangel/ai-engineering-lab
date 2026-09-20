#!/bin/bash

INPUT=$(cat)
COMMAND=$(node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write((data.tool_input && data.tool_input.command) || '');
" <<< "$INPUT")

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE 'rm +-rf|git +push +--force|git +reset +--hard|chmod +-R +777'; then
  echo "Blocked: this looks like a destructive command ('$COMMAND'). Ask the user before running it." >&2
  exit 2
fi

exit 0
