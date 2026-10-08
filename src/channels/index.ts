import { randomUUID } from "node:crypto";
import { getControls } from "@/db/ledger";
import { audit, getDb } from "@/db/client";
import { POLICY } from "@/policy/immutable";
import { emailReady, mocksAllowed } from "@/policy/realmode";

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

async function sendRealEmail(to: string, subject: string, body: string) {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
  await transporter.sendMail({
    from: process.env.OUTREACH_FROM_EMAIL!,
    to,
    subject,
    text: body,
  });
}

export async function sendMessage(opts: {
  dealId: string;
  channel: Channel;
  body: string;
  to?: string | null;
  subject?: string;
}): Promise<{ id: string; simulated: boolean }> {
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

  let simulated = false;
  if (mocksAllowed()) {
    simulated = true;
  } else {
    if (opts.channel !== "email") {
      throw new Error(
        `REAL_MODE: channel ${opts.channel} not wired — only live SMTP email`,
      );
    }
    if (!emailReady()) {
      throw new Error(
        "REAL_MODE: set SMTP_HOST, SMTP_USER, SMTP_PASS, OUTREACH_FROM_EMAIL",
      );
    }
    if (!opts.to) {
      throw new Error("REAL_MODE: prospect email required");
    }
    await sendRealEmail(
      opts.to,
      opts.subject || "Website demo for your business",
      opts.body,
    );
  }

  const id = randomUUID();
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
       VALUES (?, ?, ?, ?, 'inbound', ?, 0)`,
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
