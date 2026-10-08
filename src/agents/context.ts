/**
 * Partitioned child context — each specialist only loads what it needs.
 * This is the practical "context window expansion" via partitioning.
 */
import { formatMemoryForPrompt, retrieveWithinBudget } from "@/memory";
import { kbSearch } from "@/memory/project-kb";
import type { ChildRole } from "@/agents/children";

const ROLE_QUERIES: Record<ChildRole, string> = {
  research: "prospect research niche market reviews",
  developer: "site template demo qa html",
  sales: "negotiate outreach channel deal payment",
  qa: "qa score demo facts mobile",
  finance: "treasury revenue expense split payment",
  optimizer: "token compress FreeLLMAPI model router memory",
};

const ROLE_BUDGETS: Record<ChildRole, { memory: number; kb: number }> = {
  research: { memory: 500, kb: 400 },
  developer: { memory: 400, kb: 500 },
  sales: { memory: 600, kb: 350 },
  qa: { memory: 350, kb: 300 },
  finance: { memory: 400, kb: 300 },
  optimizer: { memory: 450, kb: 450 },
};

export function buildChildContext(role: ChildRole, extra = ""): string {
  const budgets = ROLE_BUDGETS[role];
  const q = ROLE_QUERIES[role];
  const memory = retrieveWithinBudget(budgets.memory, q);
  const kb = kbSearch(q, budgets.kb);
  return [
    `## Child role: ${role}`,
    "Load only this partition. Do not request full parent history.",
    kb,
    formatMemoryForPrompt(memory),
    extra ? `## Task\n${extra}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
