# ai-engineering-lab

A hands-on lab for learning AI agent architecture (Claude Code): CLAUDE.md, skills,
commands, subagents, hooks, a memory bank, and RAG — built on top of a
React/Vite/TS starter. Built one piece at a time.

The app itself is a chess game where the opponent's moves are chosen by an LLM,
grounded by retrieved chess knowledge.

## Stack

- React 19 + TypeScript, Vite 8, ESLint (flat config)
- Vitest for tests
- chess.js (rules/legality) + react-chessboard (board UI)
- chromadb + @chroma-core/default-embed (local, free embeddings)

## Commands

- `npm run dev` - start the dev server
- `npm run build` - typecheck (`tsc -b`) then build
- `npm run lint` - run ESLint
- `npm test` - run Vitest
- `npm run preview` — preview the production build

## Conventions

- Simplicity over robustness - this is a learning lab, not production
- Functional components + hooks
- No premature abstraction

## Layout

`.claude/` holds the exercise scaffolding: `skills/`, `commands/`, `agents/`,
`hooks/`, `memory/`. These are intentional and get filled in incrementally.

`server/` is Node-only code (the LLM opponent). It must never be imported from
`src/` — that would leak API keys into the browser bundle. It's exposed to the
app through Vite dev-server middleware at `/api/opponent-move`.

Two separate RAG systems, on purpose:
- `.claude/rag/` — keyword search over this repo's own files, for Claude Code's
  use during development.
- `.claude/rag-chess/` — Chroma-backed vector search over chess knowledge,
  queried at runtime to ground the opponent's move choice.

## Environment

Secrets live in `.env` (gitignored; see `.env.example`), loaded server-side only.
Without them the app still runs — the opponent degrades to a random legal move.
