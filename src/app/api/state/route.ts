import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/runtime/parent";
import { ensureSeeded } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSeeded();
  return NextResponse.json(getDashboardSnapshot());
}
