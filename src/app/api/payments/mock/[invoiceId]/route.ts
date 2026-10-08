import { NextResponse } from "next/server";
import { getMockInvoice } from "@/adapters/free";
import { completeDealOnPayment } from "@/business/pipeline";
import { mocksAllowed } from "@/policy/realmode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  if (!mocksAllowed()) {
    return NextResponse.json(
      { error: "REAL_MODE: mock payment endpoints disabled" },
      { status: 403 },
    );
  }
  const { invoiceId } = await ctx.params;
  const inv = getMockInvoice(invoiceId);
  if (!inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({
    invoiceId,
    ...inv,
    payUrl: `/api/payments/mock/${invoiceId}`,
    hint: "POST to simulate cleared payment (ALLOW_MOCK=1 only)",
  });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  if (!mocksAllowed()) {
    return NextResponse.json(
      { error: "REAL_MODE: mock payment clear disabled — use Stripe webhook" },
      { status: 403 },
    );
  }
  const { invoiceId } = await ctx.params;
  try {
    const dealId = completeDealOnPayment(invoiceId);
    return NextResponse.json({
      ok: true,
      dealId,
      message: "Mock payment cleared (ALLOW_MOCK=1)",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
