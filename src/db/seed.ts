import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { scoreProspect } from "@/business/pipeline";
import { syncSkillsToDb } from "@/skills/loader";
import { buildCapabilityMap } from "@/runtime/parent";
import { rememberFact, saveProcedure } from "@/memory";
import { seedProjectKb } from "@/memory/project-kb";

const prospects = [
  {
    name: "Northside Racquet Club",
    category: "Sports academy",
    city: "Austin",
    country: "US",
    website: null as string | null,
    phone: "+1-512-555-0142",
    email: "hello@northsideracquet.example",
    channel_pref: "email",
    reviews: 312,
    rating: 4.7,
    notes: "Busy courts; no public website found in seed data",
  },
  {
    name: "Harbour Dental Studio",
    category: "Dental clinic",
    city: "Brighton",
    country: "UK",
    website: null,
    phone: "+44-1273-555019",
    email: "reception@harbourdental.example",
    channel_pref: "email",
    reviews: 188,
    rating: 4.6,
    notes: "Strong Maps presence; booking mostly by phone",
  },
  {
    name: "Cedar & Sage Salon",
    category: "Salon",
    city: "Vancouver",
    country: "CA",
    website: null,
    phone: "+1-604-555-0177",
    email: null as string | null,
    channel_pref: "sms",
    reviews: 240,
    rating: 4.8,
    notes: "Instagram-active; no booking site",
  },
  {
    name: "Kinetic Physiotherapy",
    category: "Physio clinic",
    city: "Melbourne",
    country: "AU",
    website: null,
    phone: "+61-3-9555-0188",
    email: "book@kineticphysio.example",
    channel_pref: "email",
    reviews: 156,
    rating: 4.5,
    notes: "Multiple practitioners; hours public",
  },
  {
    name: "Lone Peak Yoga",
    category: "Yoga studio",
    city: "Denver",
    country: "US",
    website: "https://example-placeholder.invalid",
    phone: "+1-303-555-0110",
    email: "info@lonepeakyoga.example",
    channel_pref: "linkedin",
    reviews: 90,
    rating: 4.4,
    notes: "Has placeholder site; weak conversion",
  },
  {
    name: "Quay Street Kitchen",
    category: "Restaurant",
    city: "Auckland",
    country: "NZ",
    website: null,
    phone: "+64-9-555-0133",
    email: "events@quaystreet.example",
    channel_pref: "whatsapp",
    reviews: 420,
    rating: 4.6,
    notes: "High review count; menu mostly on social",
  },
  {
    name: "Temple Bar Fitness",
    category: "Gym",
    city: "Dublin",
    country: "IE",
    website: null,
    phone: "+353-1-555-0199",
    email: "join@templebarfitness.example",
    channel_pref: "email",
    reviews: 275,
    rating: 4.3,
    notes: "Class schedule shared via WhatsApp groups",
  },
  {
    name: "Riverbend Swim School",
    category: "Swim school",
    city: "Portland",
    country: "US",
    website: null,
    phone: "+1-503-555-0164",
    email: "lessons@riverbendswim.example",
    channel_pref: "web_form",
    reviews: 198,
    rating: 4.9,
    notes: "Seasonal demand; parents need clear schedules",
  },
];

export function ensureSeeded() {
  const db = getDb();
  const count = db.prepare(`SELECT COUNT(*) as c FROM prospects`).get() as {
    c: number;
  };
  if (count.c === 0) {
    for (const p of prospects) {
      const score = scoreProspect(p);
      db.prepare(
        `INSERT INTO prospects (id, created_at, name, category, city, country, website, phone, email, channel_pref, reviews, rating, score, notes, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')`,
      ).run(
        randomUUID(),
        new Date().toISOString(),
        p.name,
        p.category,
        p.city,
        p.country,
        p.website,
        p.phone,
        p.email,
        p.channel_pref,
        p.reviews,
        p.rating,
        score,
        p.notes,
      );
    }
  }
  syncSkillsToDb();
  buildCapabilityMap();
  seedProjectKb();
  rememberFact(
    "mission",
    "objective",
    "Create genuine value humans pay for within 10 days at $0 seed",
  );
  rememberFact("mission", "markets", "US,UK,CA,AU,NZ,IE");
  rememberFact("infra", "inference", "FreeLLMAPI primary; compress prompts; KB retrieval");
  saveProcedure("close_deal", [
    "Owner approves idea pack",
    "Build + QA demo",
    "Contact on buyer channel",
    "Negotiate within band",
    "Invoice → awaiting_payment",
    "Payment clears → closed_won → fulfill",
  ]);
  saveProcedure("token_discipline", [
    "Use templates/code for deterministic work",
    "compressPrompt before inference",
    "Route via FreeLLMAPI auto/auto:fast/auto:smart",
    "Partition child contexts; retrieve KB by query",
    "Track savedTokens and kill low-ROI children",
  ]);
}
