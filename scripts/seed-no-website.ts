import { rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { seedNoWebsiteProspects } from "../src/business/research";
import { buildDemoForProspect, listProspects } from "../src/business/pipeline";

async function main() {
  try {
    rmSync(join(process.cwd(), "data/demos"), { recursive: true, force: true });
  } catch {
    /* ok */
  }

  const ids = seedNoWebsiteProspects();
  console.log("seeded", ids.length);
  const ps = listProspects();
  for (const p of ps) {
    console.log("-", p.name, "site=", p.website, "email=", p.email);
  }
  for (const p of ps) {
    const built = await buildDemoForProspect(p.id);
    const file = join(process.cwd(), "data/demos", built.slug, "index.html");
    const size = statSync(file).size;
    const html = require("node:fs").readFileSync(file, "utf8") as string;
    const citesOwnSite =
      /https?:\/\/(?!www\.facebook|facebook|www\.fresha|fresha|www\.travelwisconsin|ratings\.food|find-and-update|beautynail)/i.test(
        html.match(/Where did the facts come from\?<\/summary><p>([\s\S]*?)<\/p>/)?.[1] ||
          "",
      );
    console.log(
      "built",
      p.name,
      built.slug,
      "qa",
      built.qa.score,
      "bytes",
      size,
      citesOwnSite ? "WARN_cites_site" : "sources_ok",
      built.qa.notes,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
