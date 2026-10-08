import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { POLICY } from "@/policy/immutable";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "insomnia.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "demos"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "credentials"), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src/db/schema.sql"),
    "utf8",
  );
  db.exec(schema);
  bootstrap(db);
  return db;
}

function bootstrap(database: Database.Database) {
  const row = database.prepare("SELECT id FROM treasury WHERE id = 1").get();
  if (!row) {
    database.prepare(
      `INSERT INTO treasury (id, owner_cents, ai_cents, reserve_cents, compute_cents, tools_cents, experiments_cents, total_revenue_cents, total_expense_cents)
       VALUES (1, 0, 0, 0, 0, 0, 0, 0, 0)`,
    ).run();
  }
  const controls = database.prepare("SELECT id FROM controls WHERE id = 1").get();
  if (!controls) {
    database
      .prepare(
        `INSERT INTO controls (id, paused, freeze_spending, freeze_outreach) VALUES (1, 0, 0, 0)`,
      )
      .run();
  }
  const epoch = database.prepare("SELECT id FROM epoch LIMIT 1").get();
  if (!epoch) {
    const started = new Date();
    const ends = new Date(
      started.getTime() + POLICY.epochDays * 24 * 60 * 60 * 1000,
    );
    database
      .prepare(
        `INSERT INTO epoch (id, started_at, ends_at, survival, extension_used, notes)
         VALUES (?, ?, ?, 'BOOT', 0, 'Zero-cost Day 0 — capability acquisition')`,
      )
      .run(randomUUID(), started.toISOString(), ends.toISOString());
  }
}

export function audit(actor: string, action: string, detail: string) {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, created_at, actor, action, detail) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), new Date().toISOString(), actor, action, detail);
}
