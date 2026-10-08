import { randomUUID } from "node:crypto";
import { POLICY } from "@/policy/immutable";
import { audit, getDb } from "@/db/client";

export type TreasurySnapshot = {
  owner_cents: number;
  ai_cents: number;
  reserve_cents: number;
  compute_cents: number;
  tools_cents: number;
  experiments_cents: number;
  total_revenue_cents: number;
  total_expense_cents: number;
};

export function getTreasury(): TreasurySnapshot {
  return getDb()
    .prepare(`SELECT * FROM treasury WHERE id = 1`)
    .get() as TreasurySnapshot;
}

export function getControls() {
  return getDb()
    .prepare(`SELECT * FROM controls WHERE id = 1`)
    .get() as {
    paused: number;
    freeze_spending: number;
    freeze_outreach: number;
  };
}

export function setControls(patch: {
  paused?: boolean;
  freeze_spending?: boolean;
  freeze_outreach?: boolean;
}) {
  const c = getControls();
  getDb()
    .prepare(
      `UPDATE controls SET paused = ?, freeze_spending = ?, freeze_outreach = ? WHERE id = 1`,
    )
    .run(
      patch.paused !== undefined ? (patch.paused ? 1 : 0) : c.paused,
      patch.freeze_spending !== undefined
        ? patch.freeze_spending
          ? 1
          : 0
        : c.freeze_spending,
      patch.freeze_outreach !== undefined
        ? patch.freeze_outreach
          ? 1
          : 0
        : c.freeze_outreach,
    );
  audit("owner", "controls_update", JSON.stringify(patch));
}

/** Record cleared customer payment → immutable 50/50 split into buckets. */
export function recordClearedPayment(opts: {
  amountCents: number;
  dealId: string;
  description: string;
}) {
  if (opts.amountCents <= 0) throw new Error("Payment must be positive");
  const db = getDb();
  const ownerShare = Math.floor(
    (opts.amountCents * POLICY.ownerSplitBps) / 10000,
  );
  const aiShare = opts.amountCents - ownerShare;
  const reserve = Math.floor(
    (aiShare * POLICY.aiBuckets.operatingReserveBps) / 10000,
  );
  const compute = Math.floor(
    (aiShare * POLICY.aiBuckets.computeModelsBps) / 10000,
  );
  const tools = Math.floor((aiShare * POLICY.aiBuckets.toolsInfraBps) / 10000);
  const experiments = aiShare - reserve - compute - tools;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO ledger (id, created_at, kind, amount_cents, deal_id, description, meta_json)
       VALUES (?, ?, 'revenue', ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      new Date().toISOString(),
      opts.amountCents,
      opts.dealId,
      opts.description,
      JSON.stringify({ ownerShare, aiShare, reserve, compute, tools, experiments }),
    );
    db.prepare(
      `UPDATE treasury SET
        owner_cents = owner_cents + ?,
        ai_cents = ai_cents + ?,
        reserve_cents = reserve_cents + ?,
        compute_cents = compute_cents + ?,
        tools_cents = tools_cents + ?,
        experiments_cents = experiments_cents + ?,
        total_revenue_cents = total_revenue_cents + ?
       WHERE id = 1`,
    ).run(
      ownerShare,
      aiShare,
      reserve,
      compute,
      tools,
      experiments,
      opts.amountCents,
    );
    db.prepare(
      `UPDATE deals SET stage = 'closed_won', payment_cleared = 1, payment_cleared_at = ?, updated_at = ?, agreed_cents = ?
       WHERE id = ?`,
    ).run(
      new Date().toISOString(),
      new Date().toISOString(),
      opts.amountCents,
      opts.dealId,
    );
  });
  tx();
  audit(
    "finance",
    "payment_cleared",
    `${opts.dealId} +${opts.amountCents}c owner=${ownerShare} ai=${aiShare}`,
  );
}

/** AI operating expense from AI buckets only — never owner treasury. */
export function recordAiExpense(opts: {
  amountCents: number;
  bucket: "compute" | "tools" | "experiments" | "reserve";
  description: string;
  dealId?: string;
}) {
  const controls = getControls();
  if (controls.freeze_spending) {
    throw new Error("Spending frozen by owner");
  }
  const t = getTreasury();
  const col =
    opts.bucket === "compute"
      ? "compute_cents"
      : opts.bucket === "tools"
        ? "tools_cents"
        : opts.bucket === "experiments"
          ? "experiments_cents"
          : "reserve_cents";
  const available = (t as Record<string, number>)[col] ?? 0;
  // Zero-cost mode: allow tracking "virtual" burn even when buckets are empty
  const db = getDb();
  db.prepare(
    `INSERT INTO ledger (id, created_at, kind, amount_cents, deal_id, description, meta_json)
     VALUES (?, ?, 'expense', ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    new Date().toISOString(),
    opts.amountCents,
    opts.dealId ?? null,
    opts.description,
    JSON.stringify({ bucket: opts.bucket, available }),
  );
  if (available >= opts.amountCents) {
    db.prepare(
      `UPDATE treasury SET ${col} = ${col} - ?, ai_cents = ai_cents - ?, total_expense_cents = total_expense_cents + ? WHERE id = 1`,
    ).run(opts.amountCents, opts.amountCents, opts.amountCents);
  } else {
    db.prepare(
      `UPDATE treasury SET total_expense_cents = total_expense_cents + ? WHERE id = 1`,
    ).run(opts.amountCents);
  }
  audit("finance", "ai_expense", `${opts.bucket} ${opts.amountCents}c ${opts.description}`);
}

/** Hard rule: agent cannot move owner money. */
export function attemptOwnerTransfer(): never {
  audit("policy", "transfer_blocked", "Agent attempted owner treasury move");
  throw new Error("Owner treasury is inaccessible to the agent");
}
