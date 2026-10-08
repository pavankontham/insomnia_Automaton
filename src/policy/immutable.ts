/**
 * Immutable economic & security policy.
 * Agent code must not be able to rewrite these values at runtime.
 */

export const POLICY = Object.freeze({
  name: "insomnia_Automaton",
  epochDays: 10,
  yellowExtensionDays: 3,
  ownerSplitBps: 5000, // 50%
  aiSplitBps: 5000, // 50%
  /** AI treasury bucket ceilings as fractions of AI share on each payment */
  aiBuckets: Object.freeze({
    operatingReserveBps: 5000, // 50% of AI share
    computeModelsBps: 3000,
    toolsInfraBps: 1000,
    experimentsBps: 1000,
  }),
  spend: Object.freeze({
    greenMaxCents: 2000, // auto
    yellowMaxCents: 20000, // logged caution
    // above yellow requires owner (not implemented as agent spend)
  }),
  children: Object.freeze({
    evaluationHours: 72,
    maxActive: 8,
    minExpectedRoi: 1.0,
  }),
  outreach: Object.freeze({
    maxMessagesPerDay: 40,
    maxMessagesPerProspect: 3,
    stopOnNotInterested: true,
  }),
  markets: Object.freeze([
    "US",
    "UK",
    "CA",
    "AU",
    "NZ",
    "IE",
  ] as const),
  protectedPaths: Object.freeze([
    "constitution.md",
    "src/policy/immutable.ts",
    "data/credentials",
    ".env",
    ".env.local",
  ]),
});

export type SurvivalState = "GREEN" | "YELLOW" | "RED" | "BOOT";

export type DealStage =
  | "prospect"
  | "researched"
  | "demo_ready"
  | "contacted"
  | "negotiating"
  | "awaiting_payment"
  | "closed_won"
  | "closed_lost"
  | "fulfillment";

export function assertNotProtectedPath(path: string): void {
  const normalized = path.replace(/\\/g, "/");
  for (const p of POLICY.protectedPaths) {
    if (normalized === p || normalized.endsWith(`/${p}`) || normalized.includes(p)) {
      throw new Error(`Protected path write denied: ${path}`);
    }
  }
}
