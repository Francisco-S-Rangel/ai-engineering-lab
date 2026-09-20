## Status

**Phase 1 (complete, pushed as ac78855):** the original 9-step lab — CLAUDE.md,
react-component skill, new-component command, code-reviewer sub-agent, two hooks,
memory bank, simple keyword RAG, TodoList feature.

**Phase 2 (complete):** chess app with an LLM opponent. TodoList removed. Added:
vitest-test skill, rebuild-rag command, test-writer sub-agent, remind-missing-spec
hook (finally justified now that tests exist), Chroma-backed chess RAG, and the
chess game itself (chess.js + react-chessboard) with a server-side opponent.

## Key decisions

### Phase 1
- Skill: functional components only, src/components/<Name>/<Name>.tsx, plain CSS co-located (no CSS modules/styled-components — keep toolchain minimal), explicit interface <Name>Props, no test file (no runner configured).
- Command: kept thin — delegates to the skill instead of duplicating its conventions; verifies via npm run build (Vite's real build script, not a CRA-style serve -s build).
- Subagent: read-only tools only (Read, Grep, Glob, Bash scoped to git diff/git status); reviews diffs only, not the whole codebase; flags correctness/version-mismatch/subscription-leak/prop-type bugs, ignores style.
- Hooks: PreToolUse on Bash blocks destructive commands (rm -rf, force-push, reset --hard, recursive chmod 777) — had to rewrite the JSON parsing from jq to node because jq wasn't on the local Git Bash PATH and was silently failing open. SessionStart prints a git snapshot.
- Recurring theme: several early drafts (routing, CRA build commands, ng CLI commands, spec-file reminders) carried over Angular/other-framework habits.

### Phase 2
- **Two RAG systems on purpose**, because they have different consumers: `.claude/rag/`
  (keyword, dev-time, for Claude Code) vs `.claude/rag-chess/` (Chroma vectors,
  runtime, grounds the opponent). Good illustration that "RAG" isn't one design.
- **Embeddings are local and free** via `@chroma-core/default-embed` — no OpenAI key.
  Chroma Cloud free tier is a $5 usage credit, not a flat vector cap. chromadb v3
  requires Node >= 20 (local Node is 22).
- **Opponent is runtime app code, NOT a Claude Code subagent.** Claude Code's
  skills/commands/subagents/hooks only exist during dev sessions. The opponent calls
  the Anthropic Messages API (Haiku, raw fetch — no SDK dependency for one call).
- **Secrets never reach the browser**: `.env` is loaded in `vite.config.ts` (Node),
  and the opponent runs in Vite dev-server middleware at `/api/opponent-move`. Client
  bundle stayed at 22 modules after adding it — verified it isn't bundled. `server/`
  lives under tsconfig.node.json so it's still type-checked.
- **Graceful degradation**: no API keys → random legal move, app still runs.
- **chess.js is the source of truth for legality**; the LLM only picks from a supplied
  legal-move list, validated on return, one corrective retry, then fallback. Covered by
  a test that was mutation-checked (removing the guard makes it fail).
- Switched the Chess instance from `useRef` to `useState` lazy init — eslint-plugin-
  react-hooks v7 forbids reading `ref.current` during render.
- `build-index.mjs` uses `upsert` (not `add`) so /rebuild-rag is safely re-runnable.

## Next steps

- Add real credentials to `.env` (ANTHROPIC_API_KEY + CHROMA_*), then run
  `/rebuild-rag` and confirm the opponent plays with `source: "llm"` instead of
  `"fallback"`.
- `test-writer` sub-agent registers on next session start (Claude Code loads agent
  definitions at startup).
- Optional cleanup: unused Vite starter assets (hero.png, react.svg, vite.svg,
  public/icons.svg) are now orphaned.
