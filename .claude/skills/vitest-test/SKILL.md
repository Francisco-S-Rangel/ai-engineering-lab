---
name: vitest-test
description: Use when writing or updating tests for this project's TypeScript/React code, so they follow the repo's test conventions.
---

# Vitest Tests

## When to use
Trigger this skill when writing a new test file or adding test cases in this project.

## Conventions

1. **Runner**: Vitest (`npm test` / `vitest run`) — not Jest, not Mocha.
2. **Location**: co-located with the code under test, `<name>.test.ts` or
   `<name>.test.tsx` next to `<name>.ts`/`<name>.tsx`.
3. **Scope**: unit-test logic (functions, hooks' return values, move
   validation/fallback behavior) — not full component rendering. This project
   has no `@testing-library/react`/`jsdom` setup; don't add it just to render a
   component in a test. If a case genuinely needs DOM rendering, flag it rather
   than silently pulling in a new testing stack.
4. **Style**: plain `describe`/`it`/`expect` from `vitest`, no custom test
   utilities or abstractions for a handful of cases.
5. **What to cover first**: pure logic with real edge cases (e.g. "opponent
   move fallback when the LLM returns an illegal move") over trivial
   getters/setters.
