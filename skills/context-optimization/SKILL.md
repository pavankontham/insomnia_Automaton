---
name: context-optimization
description: "Expand effective context via masking, compaction, KV-stable prefixes, and child partitioning"
auto-activate: true
---

# Context optimization (effective window expansion)

Do not send full history. Expand *usable* context by shrinking noise.

## Order of operations

1. **Stable prefix** — constitution + mission KB first (cache-friendly). No timestamps in system prefix.
2. **Observation masking** — replace verbose tool/HTML dumps with `[Obs:id elided. Key: …]`.
3. **Compaction** — at ~70% pressure, summarize older turns; keep decisions, deals, revenue facts at the edges.
4. **Partitioning** — give each child only its role slice from project KB + relevant memory.

## Budgets (default)

- system/mission: 15%
- retrieved KB + memory: 35%
- task/tool: 40%
- buffer: 10%

Trigger compaction when total estimate > 70% of active model window.

## Never

- Compact away approved price bands, stop-lists, or payment state
- Mask active error traces while debugging
- Load every skill body every turn — progressive disclosure only
