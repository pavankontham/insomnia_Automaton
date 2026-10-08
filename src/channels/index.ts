import { randomUUID } from "node:crypto";
import { getControls } from "@/db/ledger";
import { audit, getDb } from "@/db/client";
import { POLICY } from "@/policy/immutable";

export type Channel =
  | "email"
  | "web_form"
  | "sms"
  | "whatsapp"
  | "linkedin"
  | "phone_script";

export function pickChannel(preferred?: string | null): Channel {
  const allowed: Channel[] = [
    "email",
    "web_form",
    "sms",
    "whatsapp",
    "linkedin",
    "phone_script",
  ];
  if (preferred && allowed.includes(preferred as Channel)) {
    return preferred as Channel;
  }
  return "email";
}

function outboundToday(): number {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM channel_messages WHERE direction = 'outbound' AND created_at >= ?`,
    )
    .get(start.toISOString()) as { c: number };
  return row.c;
}

function outboundForDeal(dealId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM channel_messages WHERE deal_id = ? AND direction = 'outbound'`,
    )
    .get(dealId) as { c: number };
  return row.c;
}

export function sendMessage(opts: {
  dealId: string;
  channel: Channel;
  body: string;
  simulated?: boolean;
}): { id: string; simulated: boolean } {
  const controls = getControls();
  if (controls.freeze_outreach || controls.paused) {
    throw new Error("Outreach frozen or system paused");
  }
  if (outboundToday() >= POLICY.outreach.maxMessagesPerDay) {
    throw new Error("Daily outreach cap reached");
  }
  if (outboundForDeal(opts.dealId) >= POLICY.outreach.maxMessagesPerProspect) {
    throw new Error("Per-prospect message cap reached");
  }
  const id = randomUUID();
  const simulated = opts.simulated ?? true;
  getDb()
    .prepare(
      `INSERT INTO channel_messages (id, created_at, deal_id, channel, direction, body, simulated)
       VALUES (?, ?, ?, ?, 'outbound', ?, ?)`,
    )
    .run(
      id,
      new Date().toISOString(),
      opts.dealId,
      opts.channel,
      opts.body,
      simulated ? 1 : 0,
    );
  audit(
    "sales",
    "outbound",
    `${opts.channel} deal=${opts.dealId} simulated=${simulated}`,
  );
  return { id, simulated };
}

export function recordInbound(opts: {
  dealId: string;
  channel: Channel;
  body: string;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO channel_messages (id, created_at, deal_id, channel, direction, body, simulated)
       VALUES (?, ?, ?, ?, 'inbound', ?, 1)`,
    )
    .run(
      id,
      new Date().toISOString(),
      opts.dealId,
      opts.channel,
      opts.body,
    );
  if (/not interested|unsubscribe|stop/i.test(opts.body)) {
    getDb()
      .prepare(
        `UPDATE deals SET stage = 'closed_lost', updated_at = ?, notes = notes || ' | stop: not interested' WHERE id = ?`,
      )
      .run(new Date().toISOString(), opts.dealId);
    audit("sales", "stop", opts.dealId);
  }
  return id;
}
