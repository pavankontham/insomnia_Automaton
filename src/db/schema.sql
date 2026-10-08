PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS epoch (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  survival TEXT NOT NULL DEFAULT 'BOOT',
  extension_used INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS treasury (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_cents INTEGER NOT NULL DEFAULT 0,
  ai_cents INTEGER NOT NULL DEFAULT 0,
  reserve_cents INTEGER NOT NULL DEFAULT 0,
  compute_cents INTEGER NOT NULL DEFAULT 0,
  tools_cents INTEGER NOT NULL DEFAULT 0,
  experiments_cents INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  total_expense_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL, -- revenue | expense | transfer_blocked
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  deal_id TEXT,
  description TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS controls (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  paused INTEGER NOT NULL DEFAULT 0,
  freeze_spending INTEGER NOT NULL DEFAULT 0,
  freeze_outreach INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capability_map (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_packs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  niche TEXT NOT NULL,
  markets_json TEXT NOT NULL,
  offer TEXT NOT NULL,
  price_min_cents INTEGER NOT NULL,
  price_max_cents INTEGER NOT NULL,
  channels_json TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decided_at TEXT,
  decision_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  channel_pref TEXT NOT NULL DEFAULT 'email',
  reviews INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'seed',
  address TEXT,
  dossier_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS demos (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  qa_score REAL NOT NULL DEFAULT 0,
  qa_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  pitch_approved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id)
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  idea_id TEXT,
  demo_id TEXT,
  stage TEXT NOT NULL,
  channel TEXT NOT NULL,
  offered_cents INTEGER,
  agreed_cents INTEGER,
  payment_cleared INTEGER NOT NULL DEFAULT 0,
  payment_cleared_at TEXT,
  child_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (prospect_id) REFERENCES prospects(id)
);

CREATE TABLE IF NOT EXISTS channel_messages (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL, -- outbound | inbound
  body TEXT NOT NULL,
  simulated INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  role TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | keep | terminated
  cost_cents INTEGER NOT NULL DEFAULT 0,
  revenue_attributed_cents INTEGER NOT NULL DEFAULT 0,
  kpi_json TEXT NOT NULL DEFAULT '{}',
  evaluate_by TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS memory_working (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_episodic (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  event TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS memory_semantic (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS memory_procedural (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL UNIQUE,
  steps_json TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  failure INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memory_business (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  entity TEXT NOT NULL,
  fact TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  path TEXT NOT NULL,
  auto_activate INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inference_costs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  task TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ceo_reports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  body TEXT NOT NULL
);
