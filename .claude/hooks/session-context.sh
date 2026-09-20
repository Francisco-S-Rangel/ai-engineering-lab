#!/bin/bash

echo "== Session context =="
echo "Branch: $(git branch --show-current 2>/dev/null)"
echo
echo "-- Working tree (git status --short) --"
git status --short
echo
echo "-- Last commit --"
git log -1 --oneline 2>/dev/null
echo

MEMORY_FILE="$CLAUDE_PROJECT_DIR/.claude/memory/project-state.md"
if [ -f "$MEMORY_FILE" ]; then
  echo "-- Memory bank (.claude/memory/project-state.md) --"
  cat "$MEMORY_FILE"
fi
