import { NextResponse } from "next/server";
import { getDb, audit } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only: approve or revoke email pitch for a specific demo. */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    demoId?: string;
    slug?: string;
    approve?: boolean;
  };
  const approve = body.approve !== false;
  let demoId = body.demoId;
  if (!demoId && body.slug) {
    const row = getDb()
      .prepare(`SELECT id FROM demos WHERE slug = ?`)
      .get(body.slug) as { id: string } | undefined;
    demoId = row?.id;
  }
  if (!demoId) {
    return NextResponse.json({ error: "demoId or slug required" }, { status: 400 });
  }
  const demo = getDb()
    .prepare(
      `SELECT d.*, p.name as prospect_name, p.email FROM demos d JOIN prospects p ON p.id = d.prospect_id WHERE d.id = ?`,
    )
    .get(demoId) as
    | { id: string; slug: string; qa_score: number; prospect_name: string; email: string | null }
    | undefined;
  if (!demo) {
    return NextResponse.json({ error: "demo not found" }, { status: 404 });
  }
  if (approve && demo.qa_score < 85) {
    return NextResponse.json(
      { error: "QA too low — rebuild before approving pitch" },
      { status: 400 },
    );
  }
  if (approve && !demo.email) {
    return NextResponse.json(
      { error: "Prospect has no email on file — cannot pitch yet" },
      { status: 400 },
    );
  }
  getDb()
    .prepare(`UPDATE demos SET pitch_approved = ? WHERE id = ?`)
    .run(approve ? 1 : 0, demoId);
  audit(
    "owner",
    approve ? "pitch_approved" : "pitch_revoked",
    `${demo.slug} ${demo.prospect_name}`,
  );
  return NextResponse.json({
    ok: true,
    demoId,
    slug: demo.slug,
    prospect: demo.prospect_name,
    pitch_approved: approve,
  });
}
