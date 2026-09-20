---
name: react-component
description: Use when creating a new React component for this project, so it follows the repo's file layout and conventions.
---

# React Component

## When to use
Trigger this skill when generating a new React component for this project.

## Conventions

1. **Naming**: PascalCase, matching the component's purpose (e.g. `UserCard`).
2. **Type**: functional component with hooks — no class components.
3. **Location**: `src/components/<ComponentName>/<ComponentName>.tsx`.
4. **Styling**: a co-located plain CSS file, `src/components/<ComponentName>/<ComponentName>.css`, imported into the component. No CSS modules or styled-components (keep the toolchain minimal — this is a lab).
5. **Props**: typed with an explicit `interface <ComponentName>Props`, declared above the component.
6. **No test file** — no test runner is configured yet (see `CLAUDE.md`).
