import { NextResponse } from "next/server";
import { runHeartbeatTick } from "@/runtime/parent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runHeartbeatTick();
  return NextResponse.json(result);
}
