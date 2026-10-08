/**
 * Optional long-running heartbeat worker (outside Next.js).
 * Usage: pnpm worker
 */
import { ensureSeeded } from "@/db/seed";
import { runHeartbeatTick } from "@/runtime/parent";

const INTERVAL_MS = Number(process.env.HEARTBEAT_MS ?? 60_000);

async function main() {
  ensureSeeded();
  console.log(`insomnia_Automaton worker — heartbeat every ${INTERVAL_MS}ms`);
  for (;;) {
    try {
      const result = await runHeartbeatTick();
      console.log(new Date().toISOString(), result.survival, result.actions.join(","));
    } catch (e) {
      console.error("tick failed", e);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
