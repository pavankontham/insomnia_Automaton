import { NextResponse } from "next/server";
import {
  advanceDeal,
  completeDealOnPayment,
  listDeals,
  negotiateStep,
} from "@/business/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listDeals());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "advance" | "negotiate" | "clear_payment";
    prospectId?: string;
    ideaId?: string;
    dealId?: string;
    buyerReply?: string;
    invoiceId?: string;
  };
  try {
    if (body.action === "advance") {
      if (!body.prospectId) {
        return NextResponse.json({ error: "prospectId required" }, { status: 400 });
      }
      const dealId = await advanceDeal(body.prospectId, body.ideaId);
      return NextResponse.json({ dealId });
    }
    if (body.action === "negotiate") {
      if (!body.dealId) {
        return NextResponse.json({ error: "dealId required" }, { status: 400 });
      }
      const result = await negotiateStep(body.dealId, body.buyerReply);
      return NextResponse.json(result);
    }
    if (body.action === "clear_payment") {
      if (!body.invoiceId) {
        return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
      }
      const dealId = completeDealOnPayment(body.invoiceId);
      return NextResponse.json({ dealId, stage: "fulfillment" });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
