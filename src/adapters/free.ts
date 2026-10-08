import fs from "node:fs";
import path from "node:path";
import type {
  ComputeAdapter,
  DomainAdapter,
  HostingAdapter,
  PaymentAdapter,
} from "@/adapters/types";

export const localCompute: ComputeAdapter = {
  id: "local-free",
  describe: () => "Local process + free LLM tiers (GROQ/GEMINI keys optional)",
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
  { dealId: string; amountCents: number; cleared: boolean }
>();

export const mockPayments: PaymentAdapter = {
  id: "mock-payments",
  async createInvoice(opts) {
    const invoiceId = `inv_${opts.dealId.slice(0, 8)}`;
    invoices.set(invoiceId, {
      dealId: opts.dealId,
      amountCents: opts.amountCents,
      cleared: false,
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

export function markMockInvoiceCleared(invoiceId: string) {
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
