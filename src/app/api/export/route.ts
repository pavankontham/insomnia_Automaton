import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/runtime/parent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = getDashboardSnapshot();
  return new NextResponse(JSON.stringify(snap, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="insomnia-export.json"',
    },
  });
}
