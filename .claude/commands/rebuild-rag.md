---
description: Rebuild the Chroma-backed chess-knowledge RAG index
---

Run the chess RAG indexing script:

```bash
node .claude/rag-chess/build-index.mjs
```

This chunks `.claude/rag-chess/corpus/*` (Capablanca's *Chess Fundamentals* +
curated opening notes) and upserts them into the Chroma Cloud collection
`chess-knowledge`, using local embeddings (`@chroma-core/default-embed`, free,
no external API key needed for embedding). It's safe to re-run — it upserts by
a stable chunk id rather than appending duplicates.

Requires `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE` in `.env` (copy
from `.env.example` if it doesn't exist yet). If those aren't set, the script
exits with a clear error rather than a stack trace — report that back plainly
rather than treating it as a bug.

Report the chunk/file counts and the final "Indexed N chunks..." confirmation,
or the credential error if that's what happened.
