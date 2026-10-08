/**
 * Phase C seam — Conway Cloud adapter stub.
 * Not used in zero-cost V0. Wire when revenue funds paid compute.
 */
import type {
  ComputeAdapter,
  DomainAdapter,
  HostingAdapter,
  PaymentAdapter,
} from "@/adapters/types";

export const conwayComputeStub: ComputeAdapter = {
  id: "conway-compute-stub",
  describe: () =>
    "Conway Cloud compute (stub). Enable with CONWAY_API_KEY after revenue.",
  available: () => Boolean(process.env.CONWAY_API_KEY),
};

export const conwayHostingStub: HostingAdapter = {
  id: "conway-hosting-stub",
  async publishDemo() {
    throw new Error("Conway hosting not enabled in zero-cost mode");
  },
};

export const conwayPaymentsStub: PaymentAdapter = {
  id: "conway-x402-stub",
  async createInvoice() {
    throw new Error("Conway x402 not enabled in zero-cost mode");
  },
  async isCleared() {
    return false;
  },
};

export const conwayDomainsStub: DomainAdapter = {
  id: "conway-domains-stub",
  async provisionCustomDomain() {
    return { ok: false, reason: "Conway domains stub — not enabled" };
  },
};
