# Architecture

Notes on each piece of the agent architecture: what it is, why it exists, and what I
learned building it. Written for someone who knows the concepts exist but hasn't wired
them up.

The underlying problem every piece solves is the same: **an LLM has no persistent
memory and a finite context window.** Each mechanism is a different answer to "get the
right context in front of the model at the right time, without flooding it."

---

## The pieces

### CLAUDE.md — always-on rules

Read automatically at the start of every session. The project's constitution: stack,
commands, conventions.

Because it's *always* loaded, it competes for context with everything else. So it has
to stay lean. The temptation is to document everything here; the discipline is to
document only what's worth repeating on every single turn.

What I deliberately left out: invented rules the project doesn't follow, and testing
instructions back when no test runner existed. Stating aspirations as facts in a file
the model treats as authoritative is worse than saying nothing.

### Skills — loaded on demand

A skill is a reusable instruction package the agent pulls in *only when relevant*. The
`description` field is the trigger — it's matched against the request to decide whether
to load the body.

Two here:
- `react-component` — component conventions (functional, co-located plain CSS, typed props)
- `vitest-test` — test conventions (co-located `*.test.ts`, logic over rendering)

**The mistake worth knowing about:** my first draft of `react-component` listed
*options* — "CSS modules, styled-components, or plain CSS." That's documentation, not
instruction. A skill should decide. Rewritten to name one approach, it became useful.

### Commands — named workflows

A slash command is a parameterized prompt that triggers a repeatable process. Unlike a
skill (which the agent chooses), a command is invoked explicitly.

- `/new-component <Name>` — scaffolds via the `react-component` skill, then verifies the build
- `/rebuild-rag` — reindexes the chess corpus into Chroma
- `/search-repo <query>` — keyword search over this repo's own files

Commands should stay **thin**. `/new-component` doesn't restate the component
conventions; it delegates to the skill that owns them. Duplicating them would mean two
places to update and two places to drift.

### Subagents — isolated context

A subagent has its own context window and system prompt. It doesn't inherit the main
conversation, does its task, and returns a summary. That isolation is the point: a
reviewer doesn't need the whole session history, just the diff.

- `code-reviewer` — **read-only** (`Read`, `Grep`, `Glob`, `Bash` scoped to `git diff`/`git status`). Reviews the diff, reports findings, changes nothing.
- `test-writer` — writes tests, and is told explicitly never to modify the file under test. If something can't be tested without changing it, that's a finding to report, not a refactor to perform.

Tool grants are the real boundary. It's tempting to hand a subagent everything; scoping
them to what the job needs is what makes delegation safe.

**Gotcha:** agent definitions load at *session start*. A newly created subagent isn't
available until the next session — unlike skills and commands, which register immediately.

### Hooks — deterministic guardrails

Hooks fire on lifecycle events whether or not the agent thinks they're relevant. That's
the difference: a skill is a suggestion, a hook is a rule.

Configured in `.claude/settings.json` (registration: which event, which matcher, which
command), with the logic in `.claude/hooks/*.sh` (the actual decision).

| Hook | Event | What it does |
|---|---|---|
| `block-dangerous-commands.sh` | `PreToolUse` on `Bash` | Blocks `rm -rf`, force-push, `reset --hard`, recursive `chmod 777` |
| `session-context.sh` | `SessionStart` | Prints git branch/status/last commit **and the memory bank** |
| `remind-missing-spec.sh` | `PostToolUse` on `Write`/`Edit` | Flags source files with no co-located test |

A `PreToolUse` hook blocks by exiting with code **2**; stderr becomes the reason the
agent sees. Exit 0 means no objection.

### Memory bank — state across sessions

`.claude/memory/project-state.md`: status, decisions, next steps. Plain markdown,
versioned in git.

On its own it's inert — nothing reads it automatically. Wiring it into the
`SessionStart` hook is what makes it *actually* work: project memory that loads itself
instead of memory someone has to remember to ask for. That combination — a hook making
a passive artifact active — was the moment the pieces stopped feeling separate.

What belongs in it: decisions and their *reasons*. Not what the code does (read the
code), not who changed what (read git log) — but *why* we chose this over that, which
is the part neither of those preserves.

### RAG — two of them

Covered in the README, but the short version: retrieval design follows the consumer.

`.claude/rag/` is keyword scoring over a local JSON index, for answering "where is X"
during development. Chunk the repo's markdown and source, score chunks by how many
query terms they contain, return the top few. No embeddings, no service, no cost —
and for a few dozen files it works fine.

`.claude/rag-chess/` is Chroma vector search over ~217 chunks of chess writing
(Capablanca's public-domain *Chess Fundamentals*, plus hand-written opening notes).
Semantic similarity matters here, because a board position doesn't share keywords with
the prose that explains it.

Two implementation notes:
- **Embeddings run locally and free** via `@chroma-core/default-embed` (a bundled ONNX model). No embedding API key. Chroma Cloud's free tier is a $5 usage credit, not a flat vector cap.
- **`upsert`, not `add`** — indexing uses stable chunk ids so `/rebuild-rag` is safely re-runnable instead of appending duplicates on every run.

---

## The application

### Keeping secrets out of the browser

The opponent needs API keys. A Vite app is frontend-only, and anything imported from
`src/` ends up in a bundle the user can read — so calling the API from the component
would publish the keys.

The fix without adding a backend: **Vite dev-server middleware**. `vite.config.ts`
registers a handler at `/api/opponent-move` that runs in Node. `.env` is loaded there
via `process.loadEnvFile()` — deliberately *not* Vite's `loadEnv`, which is for
client-exposed `VITE_`-prefixed values.

Verified rather than assumed: the client bundle stayed at **22 modules** after adding
the opponent, confirming `server/` isn't bundled. `server/` also sits under
`tsconfig.node.json` so it's still type-checked despite living outside `src/`.

### Trusting the model with the right things

The known failure mode of LLM chess is confidently naming an illegal move. The design
assumes it will happen:

1. `chess.js` generates the legal moves. The model is given the list.
2. The response is checked against that list — exact match.
3. On a miss: one corrective retry.
4. Still wrong: fall back to a random legal move, so the game never stalls.

The model contributes *judgment*; the library owns *correctness*. That split is the
general lesson, not a chess-specific one.

I confirmed the test covering this actually works by removing the guard and watching it
fail. A green test you've never seen fail isn't evidence of anything.

### Graceful degradation

No keys → the opponent plays random legal moves. No Chroma → the model is asked without
retrieved context. The app always runs.

This turned out to matter more than expected: it's what makes the project runnable by
anyone who clones it, testable in CI, and deployable as a static demo.

---

## What went wrong

Honest list, because the mistakes were the most instructive part.

**Framework habits leaked.** Coming from Angular, early drafts referenced routes the
app didn't have, `ng` CLI commands that don't exist here, a CRA-style `serve -s build`
(Vite outputs to `dist/`, not `build/`), and spec-file reminders for a project with no
test runner. Every one of these *looked* plausible. The lesson: plausible-looking
config is the dangerous kind, because nothing errors — it just quietly doesn't apply.

**A hook that failed open.** `block-dangerous-commands.sh` originally parsed its JSON
input with `jq`, which isn't installed in Git Bash on Windows. The command failed, the
variable came back empty, an early guard returned "no objection" — and the hook silently
approved *everything*, including `rm -rf`. It looked like it was working. Rewritten to
parse with `node` (already a project dependency), then tested with an actual destructive
command to watch it block.

A security check that fails silently is worse than no check, because you trust it.

**An emptied stylesheet.** `App.css` lost all 184 lines during unrelated cleanup, while
`App.tsx` still referenced every class. The build passed — CSS isn't type-checked. The
`code-reviewer` subagent caught it by reading the diff.

**A wrong test fixture.** I wrote a "reports check" test using a move sequence I
believed was only check. It was Scholar's Mate — actual checkmate. The test failed, and
the *test* was wrong, not the code. Worth resisting the reflex to "fix" the code when a
test fails.

**A lint rule that taught me something.** `eslint-plugin-react-hooks` v7 forbids reading
`ref.current` during render. The fix wasn't a suppression — switching the `Chess`
instance from `useRef` to a `useState` lazy initializer was simply the more correct
pattern.

---

## If I kept going

- **Serverless deploy** so the live demo runs the real opponent, not just the fallback.
- **Move quality** — currently the model gets FEN plus a move list, which research suggests is the minimum viable prompt. Retrieval keyed to game phase (opening/middlegame/endgame) would likely ground it better than the position-similarity query it uses now.
- **Show the retrieval in the UI** — surfacing which passages informed each move would make the RAG visible instead of invisible plumbing.
- **`CHROMA_HOST` support** — `CloudClient` defaults to AWS us-east-1; a database in another region needs an explicit host, which isn't wired up yet.
