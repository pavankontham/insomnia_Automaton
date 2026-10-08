import { randomUUID } from "node:crypto";
import { getDb, audit } from "@/db/client";
import { scoreProspect } from "@/business/pipeline";
import { infer } from "@/inference/router";
import { evaluateSurvival } from "@/runtime/survival";
import { mocksAllowed } from "@/policy/realmode";
import { RESEARCHED_DOSSIERS } from "@/business/dossier";

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

/** True when "website" is missing or only social/booking (not a real site). */
export function hasNoRealWebsite(website?: string | null): boolean {
  if (!website) return true;
  const w = website.toLowerCase();
  if (
    w.includes("facebook.com") ||
    w.includes("instagram.com") ||
    w.includes("fresha.com") ||
    w.includes("setmore.com") ||
    w.includes("booksy.com") ||
    w.includes("vagaro.com") ||
    w.includes("yelp.com") ||
    w.includes("tripadvisor")
  )
    return true;
  return false;
}

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

/**
 * Seed hand-verified no-website prospects + dossiers.
 * Replaces any prior with-website demo targets.
 */
export function seedNoWebsiteProspects(): string[] {
  const db = getDb();
  // Clear old pipeline that targeted businesses that already have sites
  db.pragma("foreign_keys = OFF");
  db.exec(`DELETE FROM channel_messages`);
  db.exec(`DELETE FROM deals`);
  db.exec(`DELETE FROM demos`);
  db.exec(`DELETE FROM prospects`);
  db.pragma("foreign_keys = ON");

  const seeded: string[] = [];
  const rows: Array<{
    name: string;
    category: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    notes: string;
  }> = [
    {
      name: "El's Cafe",
      category: "Cafe",
      city: "Carshalton",
      country: "UK",
      phone: "+44 20 3158 9745",
      email: "elscafe1@icloud.com",
      notes: "No dedicated website — Facebook + food hygiene listings only",
    },
    {
      name: "Cassidy's Cafe LLC",
      category: "Cafe / Restaurant",
      city: "Wabeno",
      country: "US",
      phone: "+1 715-889-1784",
      email: "cassidyscafe15@yahoo.com",
      notes: "No dedicated website — Facebook + Travel Wisconsin listing",
    },
    {
      name: "Mr Barber",
      category: "Barbershop",
      city: "Rowley Regis",
      country: "UK",
      phone: "+44 7592 105188",
      email: "mrbarber.rowley@gmail.com",
      notes: "No dedicated website — Facebook + Fresha listing only",
    },
    {
      name: "Ozzy Barber Shop",
      category: "Barbershop",
      city: "Chelmsford",
      country: "UK",
      phone: "+44 7576 800889",
      email: "haydar.335@hotmail.com",
      notes: "No dedicated website — Facebook only",
    },
    {
      name: "Baker's Diary",
      category: "Bakery",
      city: "Auckland",
      country: "NZ",
      phone: "+64 27 501 2613",
      email: "bakersdiarynz@gmail.com",
      notes: "No dedicated website — Facebook shopfront only",
    },
  ];

  for (const r of rows) {
    const dossier = RESEARCHED_DOSSIERS[r.name];
    if (!dossier) continue;
    const id = randomUUID();
    const score =
      scoreProspect({ reviews: 50, rating: 4.5, website: null }) + 5;
    db.prepare(
      `INSERT INTO prospects (id, created_at, name, category, city, country, website, phone, email, channel_pref, reviews, rating, score, notes, source, dossier_json)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'email', 50, 4.5, ?, ?, 'web_research_no_site', ?)`,
    ).run(
      id,
      new Date().toISOString(),
      r.name,
      r.category,
      r.city,
      r.country,
      r.phone,
      r.email,
      score,
      r.notes,
      JSON.stringify(dossier),
    );
    seeded.push(id);
    audit("research", "prospect_no_website_seeded", r.name);
  }
  return seeded;
}

/** Discover up to `limit` real prospects with NO dedicated website. */
export async function discoverRealProspects(limit = 3): Promise<string[]> {
  if (mocksAllowed()) {
    throw new Error("Use REAL_MODE for discovery");
  }

  // Prefer curated verified list when empty
  const existingCount = (
    getDb().prepare(`SELECT COUNT(*) as c FROM prospects`).get() as { c: number }
  ).c;
  if (existingCount === 0) {
    return seedNoWebsiteProspects().slice(0, limit);
  }

  const survival = evaluateSurvival();
  const queries = [
    'cafe "facebook.com" email gmail OR hotmail OR yahoo OR icloud "no website" UK OR US',
    'barbershop "facebook" "@gmail.com" phone walk-in UK -site:yelp.com',
    'bakery Auckland OR Melbourne OR Dublin facebook email phone',
    'painting OR landscaping Denver OR Austin facebook "@gmail.com" phone free estimate',
    'restaurant "find us on facebook" email phone Wisconsin OR Oregon OR Texas',
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
      prompt: `From these public search snippets, extract ONE real local business that has NO dedicated website (Facebook/Instagram/Fresha/Booksy only is OK).
Skip any business that already has its own .com/.co.uk/.com.au site.
Return ONLY JSON: {"name":"","category":"","city":"","country":"US|UK|CA|AU|NZ|IE","website":null,"email":"public email or null","phone":"or null","notes":"why no real website"}
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
    if (!hasNoRealWebsite(found.website)) continue;
    if (have.has(found.name.toLowerCase())) continue;
    if (!found.email) continue; // need email to pitch later
    const id = randomUUID();
    const score =
      scoreProspect({
        reviews: 0,
        rating: 4,
        website: null,
      }) +
      3 +
      (found.email ? 2 : 0);
    getDb()
      .prepare(
        `INSERT INTO prospects (id, created_at, name, category, city, country, website, phone, email, channel_pref, reviews, rating, score, notes, source)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'email', 0, 4, ?, ?, 'web_research_no_site')`,
      )
      .run(
        id,
        new Date().toISOString(),
        found.name,
        found.category || "local business",
        found.city,
        found.country,
        found.phone ?? null,
        found.email ?? null,
        score,
        found.notes || "no dedicated website",
      );
    have.add(found.name.toLowerCase());
    added.push(id);
    audit("research", "prospect_found_no_website", found.name);
  }
  return added;
}
