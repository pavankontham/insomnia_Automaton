import { getDb, audit } from "@/db/client";
import { getControls, getTreasury } from "@/db/ledger";
import {
  formatMemoryForPrompt,
  rememberEpisode,
  rememberFact,
  rememberWorking,
  retrieveWithinBudget,
} from "@/memory";
import { kbSearch, seedProjectKb } from "@/memory/project-kb";
import { activeSkillPrompt, syncSkillsToDb } from "@/skills/loader";
import { getEpoch, shutdownIfRed } from "@/runtime/survival";
import { evaluateChildren, listChildren, spawnChild } from "@/agents/children";
import { buildChildContext } from "@/agents/context";
import {
  advanceDeal,
  buildDemoForProspect,
  createIdeaPack,
  listProspects,
} from "@/business/pipeline";
import { infer, listCatalog } from "@/inference/router";
import { localCompute, localHosting, payments } from "@/adapters/free";
import { conwayComputeStub } from "@/adapters/conway-stub";
import { randomUUID } from "node:crypto";
import {
  emailReady,
  mocksAllowed,
  paymentsReady,
  realReadiness,
} from "@/policy/realmode";

export type CapabilityRow = {
  category: string;
  name: string;
  available: boolean;
  notes: string;
};

export function buildCapabilityMap(): CapabilityRow[] {
  const rows: CapabilityRow[] = [
    {
      category: "Reasoning",
      name: "FreeLLMAPI stacked free tiers",
      available: Boolean(process.env.FREELLMAPI_API_KEY),
      notes: process.env.FREELLMAPI_BASE_URL || "http://127.0.0.1:43128/v1",
    },
    {
      category: "Reasoning",
      name: "Local heuristics",
      available: true,
      notes: "Last-resort zero-cost",
    },
    {
      category: "Reasoning",
      name: "Groq free tier",
      available: Boolean(process.env.GROQ_API_KEY),
      notes: "Via FreeLLMAPI or direct",
    },
    {
      category: "Reasoning",
      name: "Gemini free tier",
      available: Boolean(process.env.GEMINI_API_KEY),
      notes: "Via FreeLLMAPI or direct",
    },
    {
      category: "Token optimization",
      name: "Prompt compress + FreeLLM compress header",
      available: true,
      notes: "lossless/standard/aggressive by survival",
    },
    {
      category: "Memory",
      name: "Project KB expansion",
      available: true,
      notes: "data/kb + project_kb retrieval",
    },
    {
      category: "Coding",
      name: "Site templates",
      available: true,
      notes: "HTML generators",
    },
    {
      category: "Web",
      name: "Demo hosting (local)",
      available: localHosting.id === "local-static",
      notes: localHosting.id,
    },
    {
      category: "Infrastructure",
      name: localCompute.describe(),
      available: localCompute.available(),
      notes: localCompute.id,
    },
    {
      category: "Infrastructure",
      name: conwayComputeStub.describe(),
      available: conwayComputeStub.available(),
      notes: "Phase C stub",
    },
    {
      category: "Economics",
      name: "Live payments (Stripe)",
      available: paymentsReady(),
      notes: payments.id,
    },
    {
      category: "Human acquisition",
      name: "Live SMTP email",
      available: emailReady(),
      notes: emailReady() ? "SMTP configured" : "needs SMTP_* + OUTREACH_FROM_EMAIL",
    },
    {
      category: "Policy",
      name: "REAL_MODE (no mock commercial data)",
      available: !mocksAllowed(),
      notes: mocksAllowed() ? "ALLOW_MOCK=1" : "enforced",
    },
    {
      category: "Memory",
      name: "5-tier + token budget",
      available: true,
      notes: "working/episodic/semantic/procedural/business",
    },
    {
      category: "Human acquisition",
      name: "Other channel adapters",
      available: false,
      notes: "sms/whatsapp/linkedin/form — not live until credentials",
    },
  ];
  const db = getDb();
  for (const r of rows) {
    db.prepare(
      `INSERT INTO capability_map (id, category, name, available, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET available = excluded.available, notes = excluded.notes, updated_at = excluded.updated_at`,
    ).run(
      `${r.category}:${r.name}`,
      r.category,
      r.name,
      r.available ? 1 : 0,
      r.notes,
      new Date().toISOString(),
    );
  }
  rememberFact("environment", "capability_map", `${rows.length} entries`);
  return rows;
}

export async function runHeartbeatTick(): Promise<{
  survival: string;
  actions: string[];
}> {
  const controls = getControls();
  const actions: string[] = [];
  if (controls.paused) {
    return { survival: getEpoch().survival, actions: ["paused"] };
  }

  syncSkillsToDb();
  seedProjectKb();
  const survival = shutdownIfRed();
  evaluateChildren();
  buildCapabilityMap();

  const memory = retrieveWithinBudget(700, "business mission");
  const kb = kbSearch("mission infra memory children", 500);
  rememberWorking(
    "tick",
    `Heartbeat survival=${survival} freellmapi=${Boolean(process.env.FREELLMAPI_API_KEY)}`,
  );

  // Ensure specialist children exist (parent decides which)
  const children = listChildren();
  const needed = [
    "research",
    "developer",
    "sales",
    "qa",
    "finance",
    "optimizer",
  ] as const;
  for (const role of needed) {
    if (!children.some((c) => c.role === role && c.status === "active")) {
      try {
        spawnChild({
          role,
          objective: `${role} specialist — partitioned context, ROI-gated`,
          expectedValueCents: 150000,
          operatingCostCents: 50,
        });
        actions.push(`spawned:${role}`);
      } catch (e) {
        actions.push(`spawn_skip:${role}:${(e as Error).message}`);
      }
    }
  }

  // Optimizer child: token-efficiency pass with tiny partitioned context
  try {
    const optCtx = buildChildContext(
      "optimizer",
      "List 3 concrete token-saving actions for this tick.",
    );
    const opt = await infer({
      task: "classify",
      survival,
      prompt: optCtx,
    });
    rememberEpisode(
      `optimizer: saved~${opt.savedTokens} via ${opt.model.provider}/${opt.model.model} :: ${opt.text.slice(0, 160)}`,
      0.5,
    );
    actions.push(`optimizer:${opt.model.provider}:${opt.savedTokens}tok_saved`);
  } catch (e) {
    actions.push(`optimizer_skip:${(e as Error).message}`);
  }

  // Day-phase heuristics by epoch progress (schedule is guidance; approved ideas unlock sell loop early)
  const epoch = getEpoch();
  const day =
    Math.floor(
      (Date.now() - new Date(epoch.started_at).getTime()) / 86400_000,
    ) + 1;

  const approved = getDb()
    .prepare(`SELECT id FROM idea_packs WHERE status = 'approved' LIMIT 1`)
    .get() as { id: string } | undefined;
  const pending = getDb()
    .prepare(`SELECT COUNT(*) as c FROM idea_packs WHERE status = 'pending'`)
    .get() as { c: number };

  const ready = realReadiness();
  actions.push(
    `readiness:email=${ready.email}:pay=${ready.payments}:mock=${ready.mocksAllowed}`,
  );

  // Idea packs: never auto-approve. Only draft one pending pack for owner review.
  if (!approved && pending.c === 0) {
    const id = await createIdeaPack();
    actions.push(`idea_pending_owner:${id}`);
  }

  if (!approved) {
    actions.push("waiting_idea_approval");
  } else if (!mocksAllowed() && (!ready.email || !ready.payments)) {
    actions.push("blocked_missing_live_smtp_or_stripe");
  } else if (approved && !controls.freeze_outreach) {
    const prospects = listProspects()
      .filter((p) => mocksAllowed() || (p.source !== "seed" && p.email))
      .slice(0, 3);
    for (const p of prospects) {
      const demo = getDb()
        .prepare(`SELECT id FROM demos WHERE prospect_id = ?`)
        .get(p.id);
      if (!demo) {
        await buildDemoForProspect(p.id);
        actions.push(`demo:${p.name}`);
      }
    }
    for (const p of prospects.slice(0, 2)) {
      const existing = getDb()
        .prepare(`SELECT id FROM deals WHERE prospect_id = ?`)
        .get(p.id);
      if (!existing) {
        try {
          const dealId = await advanceDeal(p.id, approved.id);
          actions.push(`deal:${dealId}`);
        } catch (e) {
          actions.push(`deal_skip:${(e as Error).message}`);
        }
      }
    }
  } else if (controls.freeze_outreach) {
    actions.push("outreach_frozen");
  }

  const strategy = await infer({
    task: "strategy",
    survival,
    prompt: [
      "You are insomnia_Automaton parent CEO.",
      "Stable prefix: create genuine value; close only on cleared payment; never touch owner treasury.",
      // Progressive disclosure: skill names only, not full bodies every turn
      activeSkillPrompt().slice(0, 1800),
      kb,
      formatMemoryForPrompt(memory),
      `Day ${day}/10 survival=${survival}`,
      `Treasury AI=${getTreasury().ai_cents}c Owner=${getTreasury().owner_cents}c`,
      `Route catalog: ${JSON.stringify(listCatalog().strategy.map((m) => m.provider + "/" + m.model))}`,
      "Propose next high-ROI action under constitution. Be brief.",
    ].join("\n\n"),
  });
  rememberEpisode(
    `CEO (${strategy.model.provider}/${strategy.model.model} saved=${strategy.savedTokens}): ${strategy.text.slice(0, 200)}`,
    0.4,
  );
  actions.push(
    `strategy_infer:${strategy.model.provider}:saved${strategy.savedTokens}`,
  );

  writeCeoReport(
    day,
    survival,
    actions,
    `${strategy.text}\n\n[via ${strategy.model.provider}/${strategy.model.model} in=${strategy.tokensIn} out=${strategy.tokensOut} saved=${strategy.savedTokens}]`,
  );
  audit("heartbeat", "tick", actions.join(","));
  return { survival, actions };
}

function writeCeoReport(
  day: number,
  survival: string,
  actions: string[],
  strategy: string,
) {
  const t = getTreasury();
  const body = [
    `AUTOMATON DAILY REPORT — Day ${day}`,
    `Survival: ${survival}`,
    `Owner treasury: $${(t.owner_cents / 100).toFixed(2)}`,
    `AI treasury: $${(t.ai_cents / 100).toFixed(2)}`,
    `Revenue: $${(t.total_revenue_cents / 100).toFixed(2)}`,
    `Expenses: $${(t.total_expense_cents / 100).toFixed(2)}`,
    `Actions: ${actions.join(", ") || "none"}`,
    `Strategy: ${strategy}`,
  ].join("\n");
  getDb()
    .prepare(
      `INSERT INTO ceo_reports (id, created_at, body) VALUES (?, ?, ?)`,
    )
    .run(randomUUID(), new Date().toISOString(), body);
}

export function getDashboardSnapshot() {
  const db = getDb();
  return {
    serverNow: new Date().toISOString(),
    readiness: realReadiness(),
    epoch: getEpoch(),
    treasury: getTreasury(),
    controls: getControls(),
    capabilities: db
      .prepare(`SELECT * FROM capability_map ORDER BY category, name`)
      .all(),
    ideas: db.prepare(`SELECT * FROM idea_packs ORDER BY created_at DESC`).all(),
    prospects: db.prepare(`SELECT * FROM prospects ORDER BY score DESC`).all(),
    demos: db
      .prepare(
        `SELECT d.*, p.name as prospect_name FROM demos d JOIN prospects p ON p.id = d.prospect_id ORDER BY d.created_at DESC`,
      )
      .all(),
    deals: db
      .prepare(
        `SELECT d.*, p.name as prospect_name FROM deals d JOIN prospects p ON p.id = d.prospect_id ORDER BY d.updated_at DESC`,
      )
      .all(),
    children: listChildren(),
    skills: db.prepare(`SELECT * FROM skills ORDER BY name`).all(),
    reports: db
      .prepare(`SELECT * FROM ceo_reports ORDER BY created_at DESC LIMIT 7`)
      .all(),
    messages: db
      .prepare(
        `SELECT * FROM channel_messages ORDER BY created_at DESC LIMIT 40`,
      )
      .all(),
    ledger: db
      .prepare(`SELECT * FROM ledger ORDER BY created_at DESC LIMIT 40`)
      .all(),
  };
}
