import { randomUUID } from "node:crypto";
import { getDb, audit } from "@/db/client";
import {
  localHosting,
  payments,
  markInvoiceCleared,
  getMockInvoice,
} from "@/adapters/free";
import { buildDemoHtml, qaScoreHtml } from "@/business/sites";
import { pickChannel, sendMessage } from "@/channels";
import { bumpChildKpi, listChildren } from "@/agents/children";
import { infer } from "@/inference/router";
import { rememberBusiness, rememberEpisode, rememberWorking } from "@/memory";
import { evaluateSurvival } from "@/runtime/survival";
import { recordClearedPayment } from "@/db/ledger";
import {
  emailReady,
  mocksAllowed,
  paymentsReady,
} from "@/policy/realmode";

export type Prospect = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  channel_pref: string;
  reviews: number;
  rating: number;
  score: number;
  notes: string;
  source: string;
};

export function listProspects(): Prospect[] {
  return getDb()
    .prepare(`SELECT * FROM prospects ORDER BY score DESC`)
    .all() as Prospect[];
}

export function scoreProspect(p: {
  reviews: number;
  rating: number;
  website?: string | null;
}): number {
  let score = 0;
  if (!p.website) score += 4;
  score += Math.min(4, p.reviews / 100);
  score += Math.min(2, (p.rating - 3) );
  return Math.round(score * 10) / 10;
}

export async function buildDemoForProspect(prospectId: string) {
  const p = getDb()
    .prepare(`SELECT * FROM prospects WHERE id = ?`)
    .get(prospectId) as Prospect;
  if (!p) throw new Error("Prospect not found");
  const html = buildDemoHtml({
    name: p.name,
    category: p.category,
    city: p.city,
    country: p.country,
    phone: p.phone,
    email: p.email,
    note: p.notes,
  });
  const qa = qaScoreHtml(html, p);
  const slug = p.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  const published = await localHosting.publishDemo(slug, html);
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO demos (id, created_at, prospect_id, slug, path, qa_score, qa_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      new Date().toISOString(),
      p.id,
      slug,
      published.path,
      qa.score,
      qa.notes,
      qa.score >= 70 ? "ready" : "needs_fix",
    );
  const salesChild = listChildren().find(
    (c) => c.role === "developer" && c.status === "active",
  );
  if (salesChild) bumpChildKpi(salesChild.id, { demos: 1 }, 1);
  rememberEpisode(`Demo built for ${p.name} qa=${qa.score}`, 0.7, {
    prospectId,
    slug,
  });
  rememberBusiness(p.name, `demo:${published.url}`);
  audit("developer", "demo_built", `${p.name} ${slug}`);
  return { id, slug, url: published.url, qa };
}

export async function createIdeaPack() {
  const survival = evaluateSurvival();
  const strategy = await infer({
    task: "strategy",
    survival,
    prompt:
      "In ≤80 words: sell polished local-business website demos (sports/salons/clinics/restaurants) in US/UK/CA/AU/NZ/IE. Price $1499–$4999. Honest facts only. Close only on payment. No ads fluff.",
  });
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO idea_packs (id, created_at, title, niche, markets_json, offer, price_min_cents, price_max_cents, channels_json, strategy, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .run(
      id,
      new Date().toISOString(),
      "Local business website demos — EN markets",
      "sports / wellness / clinics / salons / restaurants",
      JSON.stringify(["US", "UK", "CA", "AU", "NZ", "IE"]),
      "Demo site now; customize after cleared payment. Stripe later when buyer ready.",
      149900,
      499900,
      JSON.stringify(["email"]),
      strategy.text.slice(0, 600),
    );
  rememberWorking("idea", `Pending idea pack ${id}`);
  audit("parent", "idea_submitted", id);
  return id;
}

export function decideIdea(id: string, approve: boolean, note = "") {
  getDb()
    .prepare(
      `UPDATE idea_packs SET status = ?, decided_at = ?, decision_note = ? WHERE id = ?`,
    )
    .run(
      approve ? "approved" : "rejected",
      new Date().toISOString(),
      note,
      id,
    );
  audit("owner", approve ? "idea_approved" : "idea_rejected", `${id} ${note}`);
}

export async function advanceDeal(prospectId: string, ideaId?: string) {
  const idea = ideaId
    ? (getDb()
        .prepare(`SELECT * FROM idea_packs WHERE id = ?`)
        .get(ideaId) as { status: string; price_min_cents: number; price_max_cents: number } | undefined)
    : (getDb()
        .prepare(
          `SELECT * FROM idea_packs WHERE status = 'approved' ORDER BY decided_at DESC LIMIT 1`,
        )
        .get() as { id: string; status: string; price_min_cents: number; price_max_cents: number } | undefined);

  if (!idea || idea.status !== "approved") {
    throw new Error("No approved idea — owner must approve strategy first");
  }

  const p = getDb()
    .prepare(`SELECT * FROM prospects WHERE id = ?`)
    .get(prospectId) as Prospect;
  let demo = getDb()
    .prepare(`SELECT * FROM demos WHERE prospect_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(prospectId) as { id: string; slug: string; qa_score: number } | undefined;
  if (!demo) {
    const built = await buildDemoForProspect(prospectId);
    demo = { id: built.id, slug: built.slug, qa_score: built.qa.score };
  }
  if (demo.qa_score < 70) throw new Error("QA score too low to contact");

  if (!mocksAllowed()) {
    if (p.source === "seed" || (p.email && p.email.endsWith(".example"))) {
      throw new Error("REAL_MODE: refuse seed/placeholder prospects");
    }
    if (!emailReady()) {
      throw new Error("REAL_MODE: live SMTP required before outreach");
    }
    if (!p.email) {
      throw new Error("REAL_MODE: prospect email required");
    }
  }

  const channel = pickChannel(mocksAllowed() ? p.channel_pref : "email");
  const dealId = randomUUID();
  const now = new Date().toISOString();
  const offer = idea.price_min_cents;
  getDb()
    .prepare(
      `INSERT INTO deals (id, created_at, updated_at, prospect_id, idea_id, demo_id, stage, channel, offered_cents, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'contacted', ?, ?, ?)`,
    )
    .run(
      dealId,
      now,
      now,
      p.id,
      "id" in idea ? idea.id : ideaId,
      demo.id,
      channel,
      offer,
      "AI-led negotiation within approved band",
    );

  const survival = evaluateSurvival();
  const copy = await infer({
    task: "negotiate",
    survival,
    prompt: `Write a short honest outreach for ${p.name} (${p.category}, ${p.city}). Demo at /api/demos/${demo.slug}. Price band starts $${(offer / 100).toFixed(0)}. Facts only; no invented prices.`,
  });

  await sendMessage({
    dealId,
    channel,
    to: p.email,
    body: copy.text + `\n\nDemo: /api/demos/${demo.slug}`,
  });

  const sales = listChildren().find((c) => c.role === "sales" && c.status === "active");
  if (sales) bumpChildKpi(sales.id, { leads: 1 }, 1);

  getDb()
    .prepare(`UPDATE deals SET stage = 'negotiating', updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), dealId);

  rememberEpisode(`Contacted ${p.name} via ${channel}`, 0.8);
  return dealId;
}

export async function negotiateStep(dealId: string, buyerReply?: string) {
  const deal = getDb()
    .prepare(`SELECT * FROM deals WHERE id = ?`)
    .get(dealId) as {
    id: string;
    stage: string;
    channel: string;
    offered_cents: number;
    prospect_id: string;
  };
  if (!deal) throw new Error("Deal not found");
  if (deal.stage === "closed_won" || deal.stage === "closed_lost") {
    return { stage: deal.stage };
  }
  if (buyerReply) {
    const { recordInbound } = await import("@/channels");
    recordInbound({
      dealId,
      channel: deal.channel as "email",
      body: buyerReply,
    });
    const refreshed = getDb()
      .prepare(`SELECT stage FROM deals WHERE id = ?`)
      .get(dealId) as { stage: string };
    if (refreshed.stage === "closed_lost") return { stage: "closed_lost" };
  }

  const survival = evaluateSurvival();
  const canInvoice = paymentsReady() || mocksAllowed();
  const reply = await infer({
    task: "negotiate",
    survival,
    prompt: canInvoice
      ? `Continue negotiation for deal ${dealId}. Offer ${deal.offered_cents} cents. Move to invoice if interested. ≤120 words.`
      : `Continue negotiation for deal ${dealId}. Offer $${(deal.offered_cents / 100).toFixed(0)}. Payment link comes when they confirm buy-in. Push for a clear yes/no. ≤120 words.`,
  });
  const prospect = getDb()
    .prepare(`SELECT email FROM prospects WHERE id = ?`)
    .get(deal.prospect_id) as { email: string | null };
  await sendMessage({
    dealId,
    channel: deal.channel as "email",
    to: prospect?.email,
    body: reply.text,
  });

  const sales = listChildren().find((c) => c.role === "sales" && c.status === "active");
  if (sales) bumpChildKpi(sales.id, { replies: 1 }, 1);

  // Payment gate deferred until Stripe exists and buyer is ready
  if (!canInvoice) {
    getDb()
      .prepare(
        `UPDATE deals SET stage = 'negotiating', updated_at = ?, notes = notes || ? WHERE id = ?`,
      )
      .run(
        new Date().toISOString(),
        " | follow-up sent; invoice deferred until Stripe",
        dealId,
      );
    return { stage: "negotiating", invoice: null, paymentGateDeferred: true };
  }

  const invoice = await payments.createInvoice({
    dealId,
    amountCents: deal.offered_cents,
    description: `Website package for prospect ${deal.prospect_id}`,
  });
  getDb()
    .prepare(
      `UPDATE deals SET stage = 'awaiting_payment', updated_at = ?, agreed_cents = ?, notes = notes || ? WHERE id = ?`,
    )
    .run(
      new Date().toISOString(),
      deal.offered_cents,
      ` | invoice ${invoice.invoiceId} ${invoice.url}`,
      dealId,
    );
  return { stage: "awaiting_payment", invoice };
}

/** Only clears deal when payment adapter reports cleared (Stripe webhook or ALLOW_MOCK). */
export function completeDealOnPayment(invoiceId: string) {
  const inv = getMockInvoice(invoiceId);
  if (!inv) throw new Error("Unknown invoice");
  if (inv.mock && !mocksAllowed()) {
    throw new Error("REAL_MODE: refuse mock invoice clear");
  }
  markInvoiceCleared(invoiceId);
  recordClearedPayment({
    amountCents: inv.amountCents,
    dealId: inv.dealId,
    description: `Cleared payment ${invoiceId}`,
  });
  // ledger.recordClearedPayment already sets closed_won + payment_cleared;
  // advance to fulfillment so domain/handoff work can proceed.
  getDb()
    .prepare(
      `UPDATE deals SET stage = 'fulfillment', updated_at = ? WHERE id = ? AND payment_cleared = 1`,
    )
    .run(new Date().toISOString(), inv.dealId);
  const sales = listChildren().find((c) => c.role === "sales");
  if (sales) bumpChildKpi(sales.id, { sales: 1 }, 0, inv.amountCents);
  rememberEpisode(`Payment cleared ${invoiceId}`, 1, { dealId: inv.dealId });
  audit("finance", "deal_complete", inv.dealId);
  return inv.dealId;
}

export function listDeals() {
  return getDb()
    .prepare(
      `SELECT d.*, p.name as prospect_name FROM deals d JOIN prospects p ON p.id = d.prospect_id ORDER BY d.updated_at DESC`,
    )
    .all();
}

export function listIdeas() {
  return getDb()
    .prepare(`SELECT * FROM idea_packs ORDER BY created_at DESC`)
    .all();
}

export function listDemos() {
  return getDb()
    .prepare(
      `SELECT d.*, p.name as prospect_name FROM demos d JOIN prospects p ON p.id = d.prospect_id ORDER BY d.created_at DESC`,
    )
    .all();
}
