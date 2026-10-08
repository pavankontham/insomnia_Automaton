import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb, audit } from "@/db/client";
import { listProspects, scoreProspect } from "@/business/pipeline";
import { mocksAllowed } from "@/policy/realmode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listProspects());
}

/** Add a real prospect. Rejects .example emails and seed-like placeholders. */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    category?: string;
    city?: string;
    country?: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    channel_pref?: string;
    reviews?: number;
    rating?: number;
    notes?: string;
  };
  if (!body.name || !body.category || !body.city || !body.country) {
    return NextResponse.json(
      { error: "name, category, city, country required" },
      { status: 400 },
    );
  }
  if (!mocksAllowed()) {
    if (!body.email || body.email.endsWith(".example") || body.email.includes("placeholder")) {
      return NextResponse.json(
        { error: "REAL_MODE: real prospect email required" },
        { status: 400 },
      );
    }
    if (body.website?.includes("example") || body.website?.includes("invalid")) {
      return NextResponse.json(
        { error: "REAL_MODE: refuse placeholder website" },
        { status: 400 },
      );
    }
  }
  const score = scoreProspect({
    reviews: body.reviews ?? 0,
    rating: body.rating ?? 0,
    website: body.website,
  });
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO prospects (id, created_at, name, category, city, country, website, phone, email, channel_pref, reviews, rating, score, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
    )
    .run(
      id,
      new Date().toISOString(),
      body.name,
      body.category,
      body.city,
      body.country,
      body.website ?? null,
      body.phone ?? null,
      body.email ?? null,
      body.channel_pref ?? "email",
      body.reviews ?? 0,
      body.rating ?? 0,
      score,
      body.notes ?? "",
    );
  audit("owner", "prospect_added", id);
  return NextResponse.json({ id, score });
}
