import { NextResponse } from "next/server";
import { getMockInvoice } from "@/adapters/free";
import { completeDealOnPayment } from "@/business/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await ctx.params;
  const inv = getMockInvoice(invoiceId);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({
    invoiceId,
    ...inv,
    payUrl: `/api/payments/mock/${invoiceId}`,
    hint: "POST to simulate cleared payment",
  });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await ctx.params;
  try {
    const dealId = completeDealOnPayment(invoiceId);
    return NextResponse.json({
      ok: true,
      dealId,
      message: "Payment cleared — deal complete; fulfillment unlocked",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
