---
name: token-budget
description: "Allocate token budget across memory tiers; prefer cheap models when survival is low"
auto-activate: true
---

# Token budget

Default retrieval budget ~1200 tokens.

Priority: working > episodic > semantic > procedural > business.

Per-tier caps with rollover (see `MEMORY_TIER_BUDGETS` in `src/memory/index.ts`).

In YELLOW/RED/BOOT, route to cheapest viable model. Track cost per call.

Reject tasks where expected economic utility (expected revenue contribution ÷ expected AI cost) < 1 unless owner-approved experimentation bucket funds them.
