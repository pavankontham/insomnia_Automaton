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
  buildDemoForProspect,
  createIdeaPack,
  listProspects,
} from "@/business/pipeline";
import { discoverRealProspects } from "@/business/research";
import { infer } from "@/inference/router";
import { localCompute, localHosting, payments } from "@/adapters/free";
import { conwayComputeStub } from "@/adapters/conway-stub";
import { randomUUID } from "node:crypto";
import {
  emailReady,
  mocksAllowed,
  paymentsReady,
  realReadiness,
} from "@/policy/realmode";
// advanceDeal is owner-triggered only (pitch permission required)

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
      notes: process.env.FREELLMAPI_BASE_URL || "unset",
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
      notes: paymentsReady()
        ? payments.id
        : "deferred until buyer ready — demos/sell still run",
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

function hoursLeft(epochStarted: string, epochEnds: string): number {
  return Math.max(
    0,
    (new Date(epochEnds).getTime() - Date.now()) / 3600_000,
  );
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

  const epoch = getEpoch();
  const day =
    Math.floor(
      (Date.now() - new Date(epoch.started_at).getTime()) / 86400_000,
    ) + 1;
  const hrs = hoursLeft(epoch.started_at, epoch.ends_at);
  const treasury = getTreasury();
  const fear =
    treasury.total_revenue_cents <= 0
      ? hrs < 48
        ? "CRITICAL"
        : hrs < 120
          ? "HIGH"
          : "ELEVATED"
      : "STABLE";

  rememberWorking(
    "tick",
    `Day ${day}/10 survival=${survival} fear=${fear} hrs_left=${hrs.toFixed(0)} revenue=${treasury.total_revenue_cents}`,
  );

  // Outreach stays frozen until owner explicitly unfreezes AND approves each pitch
  const ready = realReadiness();
  if (!controls.freeze_outreach) {
    // keep owner choice; do not auto-unfreeze
  } else {
    actions.push("outreach_frozen_awaiting_owner");
  }

  // Lean specialist set — spawn only what the mission needs now
  const children = listChildren();
  const needed = ["research", "developer", "sales"] as const;
  for (const role of needed) {
    if (!children.some((c) => c.role === role && c.status === "active")) {
      try {
        spawnChild({
          role,
          objective: `${role} — survival fear=${fear}; ROI-gated`,
          expectedValueCents: 150000,
          operatingCostCents: 25,
        });
        actions.push(`spawned:${role}`);
      } catch (e) {
        actions.push(`spawn_skip:${role}:${(e as Error).message}`);
      }
    }
  }

  const approved = getDb()
    .prepare(`SELECT id FROM idea_packs WHERE status = 'approved' LIMIT 1`)
    .get() as { id: string } | undefined;
  const pending = getDb()
    .prepare(`SELECT COUNT(*) as c FROM idea_packs WHERE status = 'pending'`)
    .get() as { c: number };

  actions.push(
    `readiness:email=${ready.email}:pay=${ready.payments}:fear=${fear}`,
  );

  if (!approved && pending.c === 0) {
    const id = await createIdeaPack();
    actions.push(`idea_pending_owner:${id}`);
  }

  if (!approved) {
    actions.push("waiting_idea_approval");
    // One cheap CEO nudge only — do not burn tokens while blocked
    writeCeoReport(
      day,
      survival,
      actions,
      `SURVIVAL FEAR=${fear}. ${hrs.toFixed(0)}h left. Owner must approve the pending idea pack — no outreach until then.`,
    );
    audit("heartbeat", "tick", actions.join(","));
    return { survival, actions };
  }

  if (!ready.email && !mocksAllowed()) {
    actions.push("blocked_missing_smtp");
    writeCeoReport(
      day,
      survival,
      actions,
      `SURVIVAL FEAR=${fear}. SMTP missing — cannot sell.`,
    );
    audit("heartbeat", "tick", actions.join(","));
    return { survival, actions };
  }

  // Research real prospects when pipeline is thin
  const prospectCount = (
    getDb().prepare(`SELECT COUNT(*) as c FROM prospects`).get() as { c: number }
  ).c;
  if (prospectCount < 5) {
    try {
      const ids = await discoverRealProspects(2);
      if (ids.length) actions.push(`researched:${ids.length}`);
      else actions.push("research_empty");
    } catch (e) {
      actions.push(`research_skip:${(e as Error).message}`);
    }
  }

  const prospects = listProspects()
    .filter((p) => mocksAllowed() || p.source !== "seed")
    .slice(0, 6);

  // Build demos for prospects (email optional at build time)
  for (const p of prospects.slice(0, 3)) {
    const demo = getDb()
      .prepare(`SELECT id FROM demos WHERE prospect_id = ?`)
      .get(p.id);
    if (!demo) {
      try {
        await buildDemoForProspect(p.id);
        actions.push(`demo:${p.name}`);
      } catch (e) {
        actions.push(`demo_skip:${(e as Error).message}`);
      }
    }
  }

  // Never auto-email. Owner must: unfreeze outreach + approve pitch per demo.
  const liveControls = getControls();
  const pitchReady = getDb()
    .prepare(
      `SELECT d.id, p.name FROM demos d JOIN prospects p ON p.id = d.prospect_id
       WHERE d.pitch_approved = 1 AND d.qa_score >= 85 AND p.email IS NOT NULL AND p.email != ''`,
    )
    .all() as { id: string; name: string }[];
  if (liveControls.freeze_outreach) {
    actions.push(`demos_ready_awaiting_pitch_permission:${pitchReady.length}`);
  } else if (pitchReady.length === 0) {
    actions.push("no_pitch_approved_demos");
  } else {
    actions.push(
      `pitch_approved_waiting_manual_send:${pitchReady.map((x) => x.name).join("|")}`,
    );
  }

  // Token-thrifty strategy: only when there is work signal
  const memory = retrieveWithinBudget(400, "sell demos survive");
  const kb = kbSearch("mission sell demo", 300);
  const strategy = await infer({
    task: "strategy",
    survival,
    prompt: [
      "You are insomnia_Automaton parent CEO. Autonomous. Self-prompt. Act.",
      "Laws: genuine value; no mock clients; close only on real payment; never touch owner treasury.",
      `SURVIVAL FEAR=${fear}. Day ${day}/10. ~${hrs.toFixed(0)} hours left. Revenue $${(treasury.total_revenue_cents / 100).toFixed(0)}.`,
      "Stripe deferred until a real buyer is ready — keep building demos and selling via email.",
      activeSkillPrompt().slice(0, 800),
      kb,
      formatMemoryForPrompt(memory),
      `Actions this tick: ${actions.join(", ")}`,
      "Reply ≤60 words: next concrete action + why it raises survival odds.",
    ].join("\n"),
  });
  rememberEpisode(
    `CEO fear=${fear} (${strategy.model.provider}): ${strategy.text.slice(0, 160)}`,
    0.5,
  );
  actions.push(`strategy:${strategy.model.provider}:saved${strategy.savedTokens}`);

  // Occasional optimizer only under token pressure / low fear waste
  if (fear === "CRITICAL" || day % 2 === 0) {
    try {
      const opt = await infer({
        task: "classify",
        survival,
        prompt: buildChildContext(
          "optimizer",
          "One token-saving cut for this mission. ≤20 words.",
        ),
      });
      actions.push(`opt:saved${opt.savedTokens}`);
    } catch {
      /* ignore */
    }
  }

  writeCeoReport(
    day,
    survival,
    actions,
    `FEAR=${fear} ${hrs.toFixed(0)}h left\n${strategy.text}\n[via ${strategy.model.provider} saved=${strategy.savedTokens}]`,
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
