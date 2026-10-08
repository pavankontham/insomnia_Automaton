import fs from "node:fs";
import path from "node:path";
import type {
  ComputeAdapter,
  DomainAdapter,
  HostingAdapter,
  PaymentAdapter,
} from "@/adapters/types";
import { mocksAllowed, paymentsReady } from "@/policy/realmode";

export const localCompute: ComputeAdapter = {
  id: "local-free",
  describe: () => "Local process + FreeLLMAPI / free LLM tiers",
  available: () => true,
};

export const localHosting: HostingAdapter = {
  id: "local-static",
  async publishDemo(slug, html) {
    const dir = path.join(process.cwd(), "data", "demos", slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "index.html");
    fs.writeFileSync(file, html, "utf8");
    return {
      path: file,
      url: `/api/demos/${slug}`,
    };
  },
};

const invoices = new Map<
  string,
  { dealId: string; amountCents: number; cleared: boolean; mock: boolean }
>();

/** Live Stripe invoices when keys present; mock only if ALLOW_MOCK=1. */
export const payments: PaymentAdapter = {
  id: paymentsReady() ? "stripe" : mocksAllowed() ? "mock-payments" : "payments-unconfigured",
  async createInvoice(opts) {
    if (paymentsReady()) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url:
          process.env.STRIPE_SUCCESS_URL ||
          "http://127.0.0.1:43127/?paid=1",
        cancel_url:
          process.env.STRIPE_CANCEL_URL ||
          "http://127.0.0.1:43127/?canceled=1",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: opts.amountCents,
              product_data: {
                name: opts.description,
              },
            },
          },
        ],
        metadata: { dealId: opts.dealId },
      });
      const invoiceId = session.id;
      invoices.set(invoiceId, {
        dealId: opts.dealId,
        amountCents: opts.amountCents,
        cleared: false,
        mock: false,
      });
      return {
        invoiceId,
        url: session.url || "",
        simulated: false,
      };
    }
    if (!mocksAllowed()) {
      throw new Error(
        "REAL_MODE: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET before invoicing",
      );
    }
    const invoiceId = `inv_${opts.dealId.slice(0, 8)}`;
    invoices.set(invoiceId, {
      dealId: opts.dealId,
      amountCents: opts.amountCents,
      cleared: false,
      mock: true,
    });
    return {
      invoiceId,
      url: `/api/payments/mock/${invoiceId}`,
      simulated: true,
    };
  },
  async isCleared(invoiceId) {
    return invoices.get(invoiceId)?.cleared ?? false;
  },
};

/** @deprecated use payments */
export const mockPayments = payments;

export function markMockInvoiceCleared(invoiceId: string) {
  if (!mocksAllowed()) {
    throw new Error(
      "REAL_MODE: mock payment clear disabled — use Stripe webhook",
    );
  }
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error("Unknown invoice");
  inv.cleared = true;
  return inv;
}

export function markInvoiceCleared(invoiceId: string) {
  const inv = invoices.get(invoiceId);
  if (!inv) throw new Error("Unknown invoice");
  inv.cleared = true;
  return inv;
}

export function getMockInvoice(invoiceId: string) {
  return invoices.get(invoiceId);
}

export const deferredDomains: DomainAdapter = {
  id: "deferred-domains",
  async provisionCustomDomain(opts) {
    return {
      ok: false,
      reason: `Custom domain ${opts.domain} deferred until post-payment fulfillment for deal ${opts.dealId}`,
    };
  },
};
