/**
 * Project knowledge base — "memory expansion" for a large build.
 * Stores durable facts about the codebase/business so agents don't
 * re-read entire histories every turn.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { estimateTokens } from "@/inference/compress";

const KB_DIR = path.join(process.cwd(), "data", "kb");

export function ensureKb() {
  fs.mkdirSync(KB_DIR, { recursive: true });
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS project_kb (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      namespace TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      importance REAL NOT NULL DEFAULT 0.5
    );
    CREATE INDEX IF NOT EXISTS idx_kb_ns ON project_kb(namespace);
  `);
}

export function kbUpsert(opts: {
  namespace: string;
  title: string;
  body: string;
  tags?: string[];
  importance?: number;
  id?: string;
}) {
  ensureKb();
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT id FROM project_kb WHERE namespace = ? AND title = ? LIMIT 1`,
    )
    .get(opts.namespace, opts.title) as { id: string } | undefined;
  const id = opts.id ?? existing?.id ?? randomUUID();
  if (existing) {
    db.prepare(
      `UPDATE project_kb SET updated_at = ?, body = ?, tags = ?, importance = ? WHERE id = ?`,
    ).run(
      now,
      opts.body,
      (opts.tags ?? []).join(","),
      opts.importance ?? 0.5,
      id,
    );
  } else {
    db.prepare(
      `INSERT INTO project_kb (id, created_at, updated_at, namespace, title, body, tags, importance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      now,
      now,
      opts.namespace,
      opts.title,
      opts.body,
      (opts.tags ?? []).join(","),
      opts.importance ?? 0.5,
    );
  }
  // Mirror to disk for human inspection / progressive disclosure
  const dir = path.join(KB_DIR, opts.namespace);
  fs.mkdirSync(dir, { recursive: true });
  const slug = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
  fs.writeFileSync(
    path.join(dir, `${slug}.md`),
    `# ${opts.title}\n\n${opts.body}\n`,
    "utf8",
  );
  return id;
}

export function kbSearch(query: string, budgetTokens = 800): string {
  ensureKb();
  const q = `%${query}%`;
  const rows = getDb()
    .prepare(
      `SELECT namespace, title, body, importance FROM project_kb
       WHERE title LIKE ? OR body LIKE ? OR tags LIKE ? OR namespace LIKE ?
       ORDER BY importance DESC, updated_at DESC LIMIT 40`,
    )
    .all(q, q, q, q) as Array<{
    namespace: string;
    title: string;
    body: string;
    importance: number;
  }>;

  const parts: string[] = ["## Project KB (retrieved)"];
  let used = estimateTokens(parts[0]);
  for (const r of rows) {
    const chunk = `### ${r.namespace}/${r.title}\n${r.body.slice(0, 900)}`;
    const cost = estimateTokens(chunk);
    if (used + cost > budgetTokens) break;
    parts.push(chunk);
    used += cost;
  }
  return parts.join("\n\n");
}

/** Seed durable project facts for the 10-day mission. */
export function seedProjectKb() {
  ensureKb();
  kbUpsert({
    namespace: "mission",
    title: "10-day survival objective",
    importance: 1,
    tags: ["mission", "survival"],
    body: `insomnia_Automaton: $0 seed, 10-day epoch, EN developed markets.
Owner approves ideas only. AI negotiates multi-channel. Deal closes only on cleared payment.
50/50 treasury split; owner funds inaccessible. GREEN/YELLOW/RED survival.`,
  });
  kbUpsert({
    namespace: "infra",
    title: "FreeLLMAPI router",
    importance: 0.9,
    tags: ["inference", "tokens"],
    body: `Local FreeLLMAPI at FREELLMAPI_BASE_URL (default http://127.0.0.1:43128/v1).
Unified key FREELLMAPI_API_KEY. Providers: groq + google. Model auto with compression header.
Prefer FreeLLMAPI before direct Groq/Gemini. Local heuristics only as last resort.`,
  });
  kbUpsert({
    namespace: "memory",
    title: "Memory tiers + KB",
    importance: 0.9,
    tags: ["memory", "context"],
    body: `Use 5-tier memory + project_kb. Never dump full history.
Retrieve within token budget with tier caps + rollover.
Mask verbose tool outputs; compact at ~70% pressure.
Children get partitioned context — only their role slice.`,
  });
  kbUpsert({
    namespace: "children",
    title: "Specialist roster",
    importance: 0.85,
    tags: ["agents", "roi"],
    body: `Spawn only ROI-justified specialists: research, developer, sales, qa, finance, optimizer.
72h KEEP/TERMINATE. Cap active children. Partition contexts — no shared megaprompt.`,
  });
}
