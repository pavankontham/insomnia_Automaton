import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";

export type MemoryBlock = {
  working: string[];
  episodic: string[];
  semantic: string[];
  procedural: string[];
  business: string[];
  tokenEstimate: number;
};

const AVG_CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

export function rememberWorking(kind: string, content: string, hours = 24) {
  const expires = new Date(Date.now() + hours * 3600_000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO memory_working (id, created_at, kind, content, expires_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), new Date().toISOString(), kind, content, expires);
}

export function rememberEpisode(event: string, importance = 0.5, meta: Record<string, unknown> = {}) {
  getDb()
    .prepare(
      `INSERT INTO memory_episodic (id, created_at, importance, event, meta_json) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      new Date().toISOString(),
      importance,
      event,
      JSON.stringify(meta),
    );
}

export function rememberFact(category: string, key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO memory_semantic (id, created_at, category, key, value)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(category, key) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`,
    )
    .run(randomUUID(), new Date().toISOString(), category, key, value);
}

export function saveProcedure(name: string, steps: string[]) {
  getDb()
    .prepare(
      `INSERT INTO memory_procedural (id, created_at, name, steps_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET steps_json = excluded.steps_json`,
    )
    .run(randomUUID(), new Date().toISOString(), name, JSON.stringify(steps));
}

export function rememberBusiness(entity: string, fact: string, weight = 1) {
  getDb()
    .prepare(
      `INSERT INTO memory_business (id, created_at, entity, fact, weight) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), new Date().toISOString(), entity, fact, weight);
}

/** Retrieve compressed context within a token budget (priority order). */
export function retrieveWithinBudget(budgetTokens = 1200, query = ""): MemoryBlock {
  const db = getDb();
  const now = new Date().toISOString();
  const working = (
    db
      .prepare(
        `SELECT content FROM memory_working WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC LIMIT 12`,
      )
      .all(now) as { content: string }[]
  ).map((r) => r.content);

  const episodic = (
    db
      .prepare(
        `SELECT event FROM memory_episodic ORDER BY importance DESC, created_at DESC LIMIT 20`,
      )
      .all() as { event: string }[]
  ).map((r) => r.event);

  const semantic = (
    db
      .prepare(
        `SELECT category || ':' || key || '=' || value AS line FROM memory_semantic ORDER BY created_at DESC LIMIT 30`,
      )
      .all() as { line: string }[]
  ).map((r) => r.line);

  const procedural = (
    db
      .prepare(
        `SELECT name || ': ' || steps_json AS line FROM memory_procedural ORDER BY success DESC LIMIT 10`,
      )
      .all() as { line: string }[]
  ).map((r) => r.line);

  const q = `%${query}%`;
  const business = (
    query
      ? (db
          .prepare(
            `SELECT entity || ': ' || fact AS line FROM memory_business WHERE entity LIKE ? OR fact LIKE ? ORDER BY weight DESC LIMIT 20`,
          )
          .all(q, q) as { line: string }[])
      : (db
          .prepare(
            `SELECT entity || ': ' || fact AS line FROM memory_business ORDER BY weight DESC LIMIT 20`,
          )
          .all() as { line: string }[])
  ).map((r) => r.line);

  const block: MemoryBlock = {
    working: [],
    episodic: [],
    semantic: [],
    procedural: [],
    business: [],
    tokenEstimate: 0,
  };

  const tiers: Array<[keyof Omit<MemoryBlock, "tokenEstimate">, string[]]> = [
    ["working", working],
    ["episodic", episodic],
    ["semantic", semantic],
    ["procedural", procedural],
    ["business", business],
  ];

  let used = 0;
  for (const [tier, items] of tiers) {
    for (const item of items) {
      const cost = estimateTokens(item);
      if (used + cost > budgetTokens) break;
      block[tier].push(item);
      used += cost;
    }
  }
  block.tokenEstimate = used;
  return block;
}

export function formatMemoryForPrompt(block: MemoryBlock): string {
  const parts: string[] = [
    "## Compressed memory",
    `token_estimate=${block.tokenEstimate}`,
  ];
  if (block.working.length) parts.push("### Working\n" + block.working.join("\n"));
  if (block.episodic.length) parts.push("### Episodic\n" + block.episodic.join("\n"));
  if (block.semantic.length) parts.push("### Semantic\n" + block.semantic.join("\n"));
  if (block.procedural.length) parts.push("### Procedural\n" + block.procedural.join("\n"));
  if (block.business.length) parts.push("### Business\n" + block.business.join("\n"));
  return parts.join("\n\n");
}
