---
name: memory-expansion
description: "Durable project KB + 5-tier memory so large builds stay coherent across days"
auto-activate: true
---

# Memory expansion

Short context windows are fine if long-term memory is external.

## Layers

1. **Working** — current tick goals (TTL hours)
2. **Episodic** — what happened (importance-ranked)
3. **Semantic** — facts (mission, markets, infra)
4. **Procedural** — how-to playbooks
5. **Business** — prospect/deal facts
6. **Project KB** (`data/kb/` + `project_kb` table) — durable architecture & mission docs

## Rules

- After every meaningful change, `kbUpsert` a short note (namespace + title + body).
- Before strategy/negotiate/code, `kbSearch` with a tight query inside a token budget.
- Prefer DB retrieval over re-reading transcripts or whole files.
- Children write only into their namespace (`research/`, `sales/`, …).
