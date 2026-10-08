---
name: token-budget
description: "Allocate token budget across memory tiers; prefer cheap models when survival is low"
auto-activate: true
---

# Token budget

Default retrieval budget ~1200 tokens.

Priority: working > episodic > semantic > procedural > business.

In YELLOW/RED/BOOT, route to cheapest viable model. Track cost per call.
