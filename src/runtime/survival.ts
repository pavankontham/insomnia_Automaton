import { getDb, audit } from "@/db/client";
import { getTreasury } from "@/db/ledger";
import { POLICY, type SurvivalState } from "@/policy/immutable";

export type Epoch = {
  id: string;
  started_at: string;
  ends_at: string;
  survival: SurvivalState;
  extension_used: number;
  notes: string;
};

export function getEpoch(): Epoch {
  return getDb().prepare(`SELECT * FROM epoch LIMIT 1`).get() as Epoch;
}

export function evaluateSurvival(): SurvivalState {
  const epoch = getEpoch();
  const treasury = getTreasury();
  const now = Date.now();
  const ends = new Date(epoch.ends_at).getTime();
  const clearedRevenue = treasury.total_revenue_cents;
  const nextCycleCost = estimateNextCycleCostCents();

  let state: SurvivalState = "BOOT";
  if (clearedRevenue >= nextCycleCost && nextCycleCost > 0) {
    state = "GREEN";
  } else if (clearedRevenue > 0 && clearedRevenue < nextCycleCost) {
    state = "YELLOW";
  } else {
    // Check for verified commercial commitment (awaiting_payment with agreed amount)
    const commitment = getDb()
      .prepare(
        `SELECT COUNT(*) as c FROM deals WHERE stage = 'awaiting_payment' AND agreed_cents IS NOT NULL AND agreed_cents > 0`,
      )
      .get() as { c: number };
    if (commitment.c > 0) state = "YELLOW";
    else if (now < ends) state = clearedRevenue > 0 ? "GREEN" : "BOOT";
    else state = "RED";
  }

  // End-of-epoch hard check
  if (now >= ends) {
    if (clearedRevenue >= nextCycleCost) state = "GREEN";
    else if (
      (getDb()
        .prepare(
          `SELECT COUNT(*) as c FROM deals WHERE stage = 'awaiting_payment' AND agreed_cents > 0`,
        )
        .get() as { c: number }).c > 0 &&
      epoch.extension_used === 0
    ) {
      state = "YELLOW";
      const newEnd = new Date(
        ends + POLICY.yellowExtensionDays * 86400_000,
      ).toISOString();
      getDb()
        .prepare(
          `UPDATE epoch SET ends_at = ?, extension_used = 1, survival = 'YELLOW', notes = ? WHERE id = ?`,
        )
        .run(
          newEnd,
          "YELLOW extension granted for verified awaiting_payment commitment",
          epoch.id,
        );
      audit("survival", "yellow_extension", newEnd);
      return "YELLOW";
    } else if (clearedRevenue < nextCycleCost) {
      state = "RED";
    }
  }

  getDb()
    .prepare(`UPDATE epoch SET survival = ? WHERE id = ?`)
    .run(state, epoch.id);
  return state;
}

export function estimateNextCycleCostCents(): number {
  // Zero-cost baseline: minimal next-cycle cost; rises with recorded expenses
  const t = getTreasury();
  const burn = t.total_expense_cents;
  return Math.max(100, Math.floor(burn * 0.5) || 100);
}

export function shutdownIfRed() {
  const state = evaluateSurvival();
  if (state === "RED") {
    getDb()
      .prepare(`UPDATE children SET status = 'terminated' WHERE status IN ('active','keep')`)
      .run();
    getDb()
      .prepare(`UPDATE controls SET paused = 1, freeze_spending = 1, freeze_outreach = 1 WHERE id = 1`)
      .run();
    audit("survival", "shutdown", "RED — parent and descendants halted");
  }
  return state;
}
