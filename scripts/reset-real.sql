-- Wipe all commercial / mock state. Keep schema.
DELETE FROM channel_messages;
DELETE FROM deals;
DELETE FROM demos;
DELETE FROM idea_packs;
DELETE FROM prospects;
DELETE FROM children;
DELETE FROM ceo_reports;
DELETE FROM ledger;
DELETE FROM audit_log;
DELETE FROM capability_map;
DELETE FROM memory_working;
DELETE FROM memory_episodic;
UPDATE treasury SET
  owner_cents = 0,
  ai_cents = 0,
  reserve_cents = 0,
  compute_cents = 0,
  tools_cents = 0,
  experiments_cents = 0,
  total_revenue_cents = 0,
  total_expense_cents = 0
WHERE id = 1;
UPDATE controls SET paused = 0, freeze_spending = 0, freeze_outreach = 1 WHERE id = 1;
UPDATE epoch SET survival = 'BOOT', notes = 'REAL_MODE — no mock data; outreach frozen until live channels + payments + owner idea approval' WHERE id IN (SELECT id FROM epoch LIMIT 1);
