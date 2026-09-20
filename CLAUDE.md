# ai-engineering-lab

A hands-on lab for learning AI agent architecture (Claude Code): CLAUDE.md, skills,
commands, subagents, hooks, a memory bank, and a simple RAG — built on top of a
React/Vite/TS starter. Built one piece at a time.

## Stack 

- React 19 + TypeScript, Vite 8, ESLint (flat config)
- No test runner configured yet

## Commands

- `npm run dev` - start the dev server
- `npm run build` - typecheck (`tsc -b`) then build
- `npm run lint` - run ESLint
- `npm run preview` — preview the production build

## Conventions

- Simplicity over robustness - this is a learning lab, not production
- Functional components + hooks
- No premature abstraction

## Layout

`.claude/` holds the exercise scaffolding: `skills/`, `commands/`, `agents/`,
`hooks/`, `memory/`. These are intentional and get filled in incrementally.
