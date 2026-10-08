export interface ComputeAdapter {
  id: string;
  describe(): string;
  available(): boolean;
}

export interface HostingAdapter {
  id: string;
  publishDemo(slug: string, html: string): Promise<{ url: string; path: string }>;
}

export interface PaymentAdapter {
  id: string;
  /** Create a payment request / invoice link for a deal */
  createInvoice(opts: {
    dealId: string;
    amountCents: number;
    description: string;
  }): Promise<{ invoiceId: string; url: string; simulated: boolean }>;
  /** Returns true only when funds are cleared */
  isCleared(invoiceId: string): Promise<boolean>;
}

export interface DomainAdapter {
  id: string;
  /** Only after payment cleared */
  provisionCustomDomain(opts: {
    dealId: string;
    domain: string;
  }): Promise<{ ok: boolean; reason?: string }>;
}
