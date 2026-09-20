#!/bin/bash

INPUT=$(cat)
FILE_PATH=$(node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write((data.tool_input && data.tool_input.file_path) || '');
" <<< "$INPUT")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize Windows backslashes
FILE_PATH="${FILE_PATH//\\//}"

# Only care about .ts/.tsx source files under src/, skip test files and .d.ts
if [[ "$FILE_PATH" != src/* && "$FILE_PATH" != *"/src/"* ]]; then
  exit 0
fi
if [[ "$FILE_PATH" == *.test.ts || "$FILE_PATH" == *.test.tsx || "$FILE_PATH" == *.d.ts ]]; then
  exit 0
fi
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

BASENAME="${FILE_PATH%.*}"
if [ ! -f "${BASENAME}.test.ts" ] && [ ! -f "${BASENAME}.test.tsx" ]; then
  echo "Reminder: no test file found for $FILE_PATH (expected ${BASENAME}.test.ts or .tsx)"
fi

exit 0
