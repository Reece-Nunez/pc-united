## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships. It is built from `src/` (the application code) — keep it scoped there. Do not run it on the whole repo (`.` pulls in the `.claude/` skills/tooling and drowns out the app).

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- The graph at the repo-root `graphify-out/` is kept fresh automatically by the post-commit git hook (AST-only, incremental on changed code files — no API cost). For a manual full rebuild, run the `/graphify src` slash command. Do NOT run `graphify update .` (bloats it with `.claude/` tooling) or `graphify update src` (writes a stray `src/graphify-out/` instead of updating the root one).
