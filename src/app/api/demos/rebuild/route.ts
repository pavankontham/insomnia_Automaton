import { NextResponse } from "next/server";
import { buildDemoForProspect, listProspects } from "@/business/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rebuild demos for all (or one) prospects with the premium FreeLLMAPI path. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    prospectId?: string;
  };
  const targets = body.prospectId
    ? listProspects().filter((p) => p.id === body.prospectId)
    : listProspects();
  const results = [];
  for (const p of targets) {
    try {
      const built = await buildDemoForProspect(p.id);
      results.push({
        prospect: p.name,
        slug: built.slug,
        qa: built.qa.score,
        status: built.qa.score >= 85 ? "ready" : "needs_fix",
        url: built.url,
      });
    } catch (e) {
      results.push({ prospect: p.name, error: (e as Error).message });
    }
  }
  return NextResponse.json({ rebuilt: results.length, results });
}
