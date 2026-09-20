---
description: Search this repo's own docs and code via the keyword RAG index
argument-hint: <what to look for>
---

Search the repo's keyword RAG index for: **$ARGUMENTS**

```bash
node .claude/rag/search.mjs $ARGUMENTS
```

If it errors because `.claude/rag/index.json` is missing (it's gitignored, so a
fresh clone won't have one) or the results look stale after recent file changes,
rebuild it first and search again:

```bash
node .claude/rag/build-index.mjs
```

This is the *dev-time* RAG — keyword scoring over this repo's own markdown and
source files, for answering "where is X / what did we decide about Y" without
reading the whole tree. It is not the chess RAG: `.claude/rag-chess/` is a
Chroma vector index over chess knowledge, queried at runtime by the opponent.
Use `/rebuild-rag` for that one.

Report the top matches with their file paths, and say plainly if nothing
matched rather than guessing an answer from memory.
