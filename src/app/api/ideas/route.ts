import { NextResponse } from "next/server";
import { createIdeaPack, decideIdea, listIdeas } from "@/business/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listIdeas());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "create" | "approve" | "reject";
    id?: string;
    note?: string;
  };
  if (body.action === "create") {
    const id = await createIdeaPack();
    return NextResponse.json({ id });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  decideIdea(body.id, body.action === "approve", body.note ?? "");
  return NextResponse.json({ ok: true });
}
