import { randomUUID } from "node:crypto";
import { getDb, audit } from "@/db/client";
import { getTreasury } from "@/db/ledger";
import { POLICY } from "@/policy/immutable";

export type ChildRole =
  | "research"
  | "developer"
  | "sales"
  | "qa"
  | "finance"
  | "optimizer";

export type Child = {
  id: string;
  created_at: string;
  role: string;
  objective: string;
  status: string;
  cost_cents: number;
  revenue_attributed_cents: number;
  kpi_json: string;
  evaluate_by: string;
  notes: string;
};

export function listChildren(): Child[] {
  return getDb()
    .prepare(`SELECT * FROM children ORDER BY created_at DESC`)
    .all() as Child[];
}

export function spawnChild(opts: {
  role: ChildRole;
  objective: string;
  expectedValueCents: number;
  operatingCostCents: number;
}): Child {
  const active = getDb()
    .prepare(`SELECT COUNT(*) as c FROM children WHERE status = 'active'`)
    .get() as { c: number };
  if (active.c >= POLICY.children.maxActive) {
    throw new Error("Max active children reached");
  }
  const roi =
    opts.operatingCostCents <= 0
      ? Infinity
      : opts.expectedValueCents / opts.operatingCostCents;
  if (roi < POLICY.children.minExpectedRoi) {
    throw new Error(
      `Child ROI ${roi.toFixed(2)} below minimum ${POLICY.children.minExpectedRoi}`,
    );
  }
  const treasury = getTreasury();
  // Zero-cost: allow spawn when AI treasury is empty but expected ROI is positive
  if (treasury.ai_cents < 0) {
    throw new Error("Insufficient AI treasury");
  }
  const id = randomUUID();
  const created = new Date();
  const evaluateBy = new Date(
    created.getTime() + POLICY.children.evaluationHours * 3600_000,
  ).toISOString();
  getDb()
    .prepare(
      `INSERT INTO children (id, created_at, role, objective, status, cost_cents, revenue_attributed_cents, kpi_json, evaluate_by, notes)
       VALUES (?, ?, ?, ?, 'active', ?, 0, ?, ?, ?)`,
    )
    .run(
      id,
      created.toISOString(),
      opts.role,
      opts.objective,
      opts.operatingCostCents,
      JSON.stringify({
        leads: 0,
        demos: 0,
        replies: 0,
        sales: 0,
        tokens_saved: 0,
        infer_calls: 0,
        expected_roi: roi,
        context_mode: "partitioned",
      }),
      evaluateBy,
      "Spawned under ROI gate",
    );
  audit("parent", "spawn_child", `${opts.role} ${id}`);
  return getDb().prepare(`SELECT * FROM children WHERE id = ?`).get(id) as Child;
}

export function bumpChildKpi(
  id: string,
  patch: Partial<{
    leads: number;
    demos: number;
    replies: number;
    sales: number;
    tokens_saved: number;
    infer_calls: number;
  }>,
  costDelta = 0,
  revenueDelta = 0,
) {
  const child = getDb()
    .prepare(`SELECT * FROM children WHERE id = ?`)
    .get(id) as Child | undefined;
  if (!child) return;
  const kpi = JSON.parse(child.kpi_json) as Record<string, number>;
  for (const [k, v] of Object.entries(patch)) {
    kpi[k] = (kpi[k] ?? 0) + (v ?? 0);
  }
  getDb()
    .prepare(
      `UPDATE children SET kpi_json = ?, cost_cents = cost_cents + ?, revenue_attributed_cents = revenue_attributed_cents + ? WHERE id = ?`,
    )
    .run(JSON.stringify(kpi), costDelta, revenueDelta, id);
}

export function evaluateChildren(now = new Date()) {
  const due = getDb()
    .prepare(
      `SELECT * FROM children WHERE status = 'active' AND evaluate_by <= ?`,
    )
    .all(now.toISOString()) as Child[];
  for (const child of due) {
    const roi =
      child.cost_cents <= 0
        ? child.revenue_attributed_cents > 0
          ? Infinity
          : 0
        : child.revenue_attributed_cents / child.cost_cents;
    const kpi = JSON.parse(child.kpi_json) as { replies?: number; demos?: number };
    const useful = (kpi.replies ?? 0) + (kpi.demos ?? 0) > 0;
    const keep = roi >= 1 || (useful && child.revenue_attributed_cents === 0 && roi === 0);
    // Keep if positive ROI; if zero cost and some useful output during eval, keep once; else terminate
    const status =
      roi > 0 || (child.cost_cents === 0 && useful) ? "keep" : "terminated";
    // Stricter: if no revenue and no useful output → terminate
    const finalStatus =
      child.revenue_attributed_cents > 0 || useful ? (keep || status === "keep" ? "keep" : "terminated") : "terminated";
    getDb()
      .prepare(`UPDATE children SET status = ?, notes = ? WHERE id = ?`)
      .run(
        finalStatus,
        `Eval ROI=${Number.isFinite(roi) ? roi.toFixed(2) : "inf"} useful=${useful}`,
        child.id,
      );
    audit("parent", "evaluate_child", `${child.id} -> ${finalStatus}`);
  }
}
