---
name: context-compress
description: "Build prompts from objective + retrieved memory + task, never full history"
auto-activate: true
---

# Context compression

Never dump entire history into the model.

Assemble: current objective + relevant memory tiers + compressed episodes + current task.

Prefer database lookups over re-reading transcripts.

When prior turns exceed the recent-turn budget, replace older turns with a one-line summary per turn (tool + outcome), never raw tool payloads.

Truncate tool results aggressively; keep decisions and revenue-relevant facts.
