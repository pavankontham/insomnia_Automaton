import { NextResponse } from "next/server";
import { getControls, setControls } from "@/db/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getControls());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    paused?: boolean;
    freeze_spending?: boolean;
    freeze_outreach?: boolean;
  };
  setControls(body);
  return NextResponse.json(getControls());
}
