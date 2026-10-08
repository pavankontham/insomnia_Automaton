import { syncSkillsToDb } from "@/skills/loader";
import { buildCapabilityMap } from "@/runtime/parent";
import { rememberFact, saveProcedure } from "@/memory";
import { seedProjectKb } from "@/memory/project-kb";
import { mocksAllowed } from "@/policy/realmode";

/** Bootstrap non-commercial infra only. Never inserts fake prospects/deals. */
export function ensureSeeded() {
  syncSkillsToDb();
  buildCapabilityMap();
  seedProjectKb();
  rememberFact(
    "mission",
    "objective",
    "Create genuine value humans pay for within 10 days at $0 seed",
  );
  rememberFact("mission", "markets", "US,UK,CA,AU,NZ,IE");
  rememberFact(
    "infra",
    "mode",
    mocksAllowed()
      ? "ALLOW_MOCK=1 (dev only)"
      : "REAL_MODE — no synthetic commercial data",
  );
  rememberFact("infra", "inference", "FreeLLMAPI primary; compress prompts; KB retrieval");
  saveProcedure("close_deal", [
    "Owner approves idea pack (explicit)",
    "Research real prospects (compliant sources)",
    "Build + QA demo for real businesses",
    "Contact on live channel credentials only",
    "Negotiate within approved band",
    "Real invoice → awaiting_payment",
    "Webhook-cleared payment → closed_won → fulfill",
  ]);
  saveProcedure("token_discipline", [
    "Use templates/code for deterministic work",
    "compressPrompt before inference",
    "Route via FreeLLMAPI auto/auto:fast/auto:smart",
    "Partition child contexts; retrieve KB by query",
    "Track savedTokens and kill low-ROI children",
  ]);
}
