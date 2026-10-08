import { NextResponse } from "next/server";
import { markInvoiceCleared } from "@/adapters/free";
import { completeDealOnPayment } from "@/business/pipeline";
import { paymentsReady } from "@/policy/realmode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!paymentsReady()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  const raw = Buffer.from(await req.arrayBuffer());
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; payment_status?: string };
    if (session.payment_status === "paid" || session.payment_status === "complete") {
      markInvoiceCleared(session.id);
      const dealId = completeDealOnPayment(session.id);
      return NextResponse.json({ ok: true, dealId });
    }
  }
  return NextResponse.json({ ok: true, ignored: event.type });
}
