import { randomUUID } from "node:crypto";
import { getDb, audit } from "@/db/client";
import { scoreProspect } from "@/business/pipeline";
import { infer } from "@/inference/router";
import { evaluateSurvival } from "@/runtime/survival";
import { mocksAllowed } from "@/policy/realmode";

type Found = {
  name: string;
  category: string;
  city: string;
  country: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string;
};

/** Compliant discovery: public web search snippets only — no Maps mass-scrape. */
async function searchSnippets(query: string): Promise<string> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "insomnia_Automaton/0.1 (local business research; respectful)",
    },
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const html = await res.text();
  // Strip tags coarsely; keep text for LLM extraction
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 6000);
}

function looksFake(p: Found): boolean {
  const email = (p.email || "").toLowerCase();
  const site = (p.website || "").toLowerCase();
  if (email.endsWith(".example") || email.includes("placeholder")) return true;
  if (site.includes("example") || site.includes("invalid") || site.includes("placeholder"))
    return true;
  if (!p.name || !p.city || !p.country) return true;
  return false;
}

/** Discover up to `limit` real prospects and insert if new. */
export async function discoverRealProspects(limit = 3): Promise<string[]> {
  if (mocksAllowed()) {
    throw new Error("Use REAL_MODE for discovery");
  }
  const survival = evaluateSurvival();
  const queries = [
    "independent tennis club Austin TX contact email -site:yelp.com",
    "dental clinic Brighton UK website booking contact",
    "hair salon Vancouver Canada book appointment email",
    "physiotherapy clinic Melbourne Australia contact",
    "yoga studio Denver CO website contact",
  ];
  const existing = getDb()
    .prepare(`SELECT name FROM prospects`)
    .all() as { name: string }[];
  const have = new Set(existing.map((e) => e.name.toLowerCase()));
  const added: string[] = [];

  for (const q of queries) {
    if (added.length >= limit) break;
    let snippets = "";
    try {
      snippets = await searchSnippets(q);
    } catch {
      continue;
    }
    const extracted = await infer({
      task: "research",
      survival,
      prompt: `From these public search snippets, extract ONE real local business that likely needs a better website.
Return ONLY JSON: {"name":"","category":"","city":"","country":"US|UK|CA|AU|NZ|IE","website":"https or null","email":"public email or null","phone":"or null","notes":"why weak web presence"}
No invented emails. If no public email, set email null. Snippets:\n${snippets}`,
    });
    const match = extracted.text.match(/\{[\s\S]*\}/);
    if (!match) continue;
    let found: Found;
    try {
      found = JSON.parse(match[0]) as Found;
    } catch {
      continue;
    }
    if (looksFake(found)) continue;
    if (have.has(found.name.toLowerCase())) continue;
    // REAL_MODE: allow null email for research/demo; outreach requires email later
    const id = randomUUID();
    const score = scoreProspect({
      reviews: 0,
      rating: 4,
      website: found.website,
    });
    getDb()
      .prepare(
        `INSERT INTO prospects (id, created_at, name, category, city, country, website, phone, email, channel_pref, reviews, rating, score, notes, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', 0, 4, ?, ?, 'web_research')`,
      )
      .run(
        id,
        new Date().toISOString(),
        found.name,
        found.category || "local business",
        found.city,
        found.country,
        found.website ?? null,
        found.phone ?? null,
        found.email ?? null,
        score + (found.email ? 2 : 0) + (!found.website ? 3 : 0),
        found.notes || "web research",
      );
    have.add(found.name.toLowerCase());
    added.push(id);
    audit("research", "prospect_found", found.name);
  }
  return added;
}
