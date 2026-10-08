import { infer } from "@/inference/router";
import { evaluateSurvival } from "@/runtime/survival";
import {
  RESEARCHED_DOSSIERS,
  type ProspectDossier,
} from "@/business/dossier";
import { buildPersonalInteractiveHtml } from "@/business/personalSites";

export type SiteFacts = {
  name: string;
  category: string;
  city: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  hours?: string | null;
  services?: string[];
  note?: string;
  website?: string | null;
  dossier?: ProspectDossier | null;
};

/** Prefer researched personal interactive demo; else FreeLLMAPI; else craftsmanship. */
export async function buildDemoHtml(facts: SiteFacts): Promise<string> {
  const dossier =
    facts.dossier ||
    RESEARCHED_DOSSIERS[facts.name] ||
    null;
  // Dossier-backed personal demos always win — they use researched public facts
  // (including listed membership prices). Do not fall through to thin craftsmanship.
  if (dossier) {
    return buildPersonalInteractiveHtml(facts, dossier);
  }
  const survival = evaluateSurvival();
  try {
    const result = await infer({
      task: "code",
      survival,
      prompt: sitePrompt(facts, dossier),
    });
    const html = extractHtml(result.text);
    if (html && qaScoreHtml(html, facts).score >= 80) {
      return html;
    }
  } catch {
    /* fall through */
  }
  return craftsmanshipTemplate(facts);
}

function sitePrompt(facts: SiteFacts, dossier: ProspectDossier | null): string {
  const services = (
    dossier?.services?.length
      ? dossier.services
      : facts.services?.length
        ? facts.services
        : defaultServices(facts.category)
  ).join(", ");
  return `You are an elite conversion web designer. Output ONE complete HTML5 file only (no markdown fences).

Business (facts only — never invent prices/reviews/awards/addresses beyond the dossier):
- Name: ${facts.name}
- Category: ${facts.category}
- City/Country: ${facts.city}, ${facts.country}
- Phone: ${dossier?.phone || facts.phone || "omit if unknown"}
- Email: ${dossier?.email || facts.email || "omit if unknown"}
- Address: ${dossier?.address || dossier?.addresses?.map((a) => a.line).join(" | ") || "city-level only"}
- Hours: ${dossier?.hours || facts.hours || "Ask us for current hours"}
- Services: ${services}
- About: ${dossier?.about || facts.note || "none"}
- Tagline: ${dossier?.tagline || ""}
- Existing site: ${facts.website || "none / weak"}

Must feel personally made for THIS business — use the real names/places/services above.
Interactive single-file: sticky nav, service filter chips, enquiry form with JS validation + mailto, FAQ accordion, gallery using Unsplash atmosphere images (label as atmosphere not their photos), map link, sticky call CTA.
Brand-first full-bleed hero photo+veil. Expressive Google Fonts (no Inter/Roboto/Arial). Motions. Mobile-first.
Sticky banner: personal demo by insomnia_Automaton — public facts only.
Return raw HTML starting with <!DOCTYPE html>.`;
}

function extractHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] || text).trim();
  const start = raw.search(/<!DOCTYPE html>|<html[\s>]/i);
  if (start < 0) return null;
  let html = raw.slice(start);
  const end = html.lastIndexOf("</html>");
  if (end >= 0) html = html.slice(0, end + 7);
  if (html.length < 3500) return null;
  return html;
}

export function craftsmanshipTemplate(facts: SiteFacts): string {
  const theme = nicheTheme(facts.category);
  const services = facts.services?.length
    ? facts.services
    : defaultServices(facts.category);
  const phone = facts.phone;
  const email = facts.email;
  const hours = facts.hours || "Ask us for current hours";
  const ctas = [
    phone
      ? `<a class="btn primary" href="tel:${escapeAttr(phone)}">Call ${escape(phone)}</a>`
      : "",
    email
      ? `<a class="btn ghost" href="mailto:${escapeAttr(email)}">Email</a>`
      : `<a class="btn ghost" href="#contact">Enquire</a>`,
  ]
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escape(facts.name)} · ${escape(facts.city)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?${theme.fontQuery}&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:${theme.bg}; --ink:${theme.ink}; --muted:${theme.muted};
  --accent:${theme.accent}; --accent2:${theme.accent2}; --line:${theme.line};
  --display:${theme.display}; --body:${theme.body};
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--body),Georgia,serif;color:var(--ink);background:var(--bg)}
.demo-banner{position:sticky;top:0;z-index:20;background:rgba(0,0,0,.88);color:#f4f1ea;font:600 .78rem/1.3 var(--body),sans-serif;letter-spacing:.04em;padding:.55rem 1rem;text-align:center}
.hero{min-height:100svh;display:grid;align-content:end;padding:clamp(1.25rem,4vw,3.5rem);position:relative;overflow:hidden;color:${theme.heroText}}
.hero::before{content:"";position:absolute;inset:0;background:${theme.heroBg};z-index:0}
.hero::after{content:"";position:absolute;inset:0;background:${theme.heroOverlay};z-index:1}
.hero-inner{position:relative;z-index:2;max-width:72rem}
.brand{font-family:var(--display),serif;font-size:clamp(3.2rem,10vw,7rem);line-height:.9;letter-spacing:-.04em;margin:0;max-width:14ch;animation:rise .9s ease both}
.headline{font-family:var(--display),serif;font-size:clamp(1.35rem,3vw,2rem);font-weight:500;margin:1.1rem 0 .6rem;max-width:22ch;animation:rise 1s .08s ease both}
.lede{font-size:1.05rem;max-width:38ch;opacity:.92;margin:0 0 1.6rem;animation:rise 1.05s .14s ease both}
.cta{display:flex;flex-wrap:wrap;gap:.75rem;animation:rise 1.1s .2s ease both}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:.95rem 1.35rem;border-radius:999px;text-decoration:none;font:600 .95rem var(--body),sans-serif}
.btn.primary{background:var(--accent);color:${theme.primaryText}}
.btn.ghost{border:1px solid currentColor;color:inherit}
.orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.55;animation:drift 14s ease-in-out infinite alternate;z-index:1}
.orb.a{width:42vmin;height:42vmin;right:-8vmin;top:8vmin;background:${theme.orbA}}
.orb.b{width:34vmin;height:34vmin;left:-6vmin;bottom:18vmin;background:${theme.orbB};animation-delay:-4s}
main{padding:clamp(2.5rem,6vw,5rem) clamp(1.25rem,4vw,3.5rem);display:grid;gap:clamp(2.5rem,6vw,4.5rem);max-width:72rem}
section h2{font-family:var(--display),serif;font-size:clamp(1.8rem,4vw,2.6rem);margin:0 0 .35rem;letter-spacing:-.02em}
section .sub{color:var(--muted);margin:0 0 1.4rem;max-width:48ch}
.services{display:grid;gap:0;border-top:1px solid var(--line)}
.services li{list-style:none;padding:1.05rem 0;border-bottom:1px solid var(--line);font-size:1.08rem;display:flex;justify-content:space-between;gap:1rem;animation:rise .7s ease both}
.services li span{color:var(--muted);font-size:.85rem}
.visit,.contact{display:grid;gap:1rem;grid-template-columns:1.2fr .8fr}
@media (max-width:720px){.visit,.contact{grid-template-columns:1fr}}
.block p{margin:.35rem 0;line-height:1.55}
footer{padding:2rem clamp(1.25rem,4vw,3.5rem) 3rem;color:var(--muted);font-size:.88rem;border-top:1px solid var(--line)}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(-3%,4%,0) scale(1.06)}}
</style>
</head>
<body>
<div class="demo-banner">Demo by insomnia_Automaton — facts only; no invented pricing.</div>
<header class="hero">
  <div class="orb a" aria-hidden="true"></div>
  <div class="orb b" aria-hidden="true"></div>
  <div class="hero-inner">
    <h1 class="brand">${escape(facts.name)}</h1>
    <p class="headline">${escape(theme.headline)}</p>
    <p class="lede">${escape(facts.category)} in ${escape(facts.city)}, ${escape(facts.country)}. A clear, modern home for hours, services, and the next booking.</p>
    <div class="cta">${ctas}</div>
  </div>
</header>
<main>
  <section>
    <h2>What we offer</h2>
    <p class="sub">Straight answers — contact us for current pricing.</p>
    <ul class="services">
      ${services
        .map(
          (s, i) =>
            `<li style="animation-delay:${0.05 * i}s">${escape(s)}<span>Enquire</span></li>`,
        )
        .join("")}
    </ul>
  </section>
  <section class="visit">
    <div class="block">
      <h2>Visit</h2>
      <p class="sub">Find us in ${escape(facts.city)}.</p>
      <p><strong>Hours</strong><br/>${escape(hours)}</p>
      <p><strong>Location</strong><br/>${escape(facts.city)}, ${escape(facts.country)}</p>
    </div>
    <div class="block" id="contact">
      <h2>Contact</h2>
      <p class="sub">Prefer the channel you already use with customers.</p>
      ${phone ? `<p><strong>Phone</strong><br/><a href="tel:${escapeAttr(phone)}">${escape(phone)}</a></p>` : "<p>Phone on request.</p>"}
      ${email ? `<p><strong>Email</strong><br/><a href="mailto:${escapeAttr(email)}">${escape(email)}</a></p>` : "<p>Email on request.</p>"}
      <p>${escape(facts.note || "Tell us what you need — we will respond with facts, not fluff.")}</p>
    </div>
  </section>
</main>
<footer>Demo generated for ${escape(facts.name)}. Not affiliated until the owner accepts and pays.</footer>
</body>
</html>`;
}

type Theme = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  line: string;
  display: string;
  body: string;
  fontQuery: string;
  heroBg: string;
  heroOverlay: string;
  heroText: string;
  primaryText: string;
  orbA: string;
  orbB: string;
  headline: string;
};

function nicheTheme(category: string): Theme {
  const c = category.toLowerCase();
  if (c.includes("tennis") || c.includes("racquet") || c.includes("sport")) {
    return {
      bg: "#f2efe6",
      ink: "#1a2118",
      muted: "#5c6558",
      accent: "#c45c26",
      accent2: "#1f4d3a",
      line: "rgba(26,33,24,.16)",
      display: '"Fraunces"',
      body: '"DM Sans"',
      fontQuery: "family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500;700",
      heroBg:
        "radial-gradient(1000px 700px at 80% 10%, #2f6b4f 0%, transparent 55%), linear-gradient(135deg,#12261c 0%,#1f4d3a 45%,#3a2a1c 100%)",
      heroOverlay: "linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55))",
      heroText: "#f6f1e7",
      primaryText: "#fff",
      orbA: "rgba(196,92,38,.35)",
      orbB: "rgba(255,255,255,.08)",
      headline: "Courts, coaching, community — finally clear online.",
    };
  }
  if (c.includes("dental") || c.includes("clinic") || c.includes("physio")) {
    return {
      bg: "#f5f7f8",
      ink: "#152028",
      muted: "#5b6b75",
      accent: "#0f766e",
      accent2: "#134e4a",
      line: "rgba(21,32,40,.14)",
      display: '"Libre Baskerville"',
      body: '"Source Sans 3"',
      fontQuery:
        "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700",
      heroBg:
        "radial-gradient(900px 600px at 15% 0%, #99f6e4 0%, transparent 50%), linear-gradient(160deg,#0b1c24 0%,#134e4a 55%,#1e293b 100%)",
      heroOverlay: "linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.5))",
      heroText: "#ecfeff",
      primaryText: "#ecfeff",
      orbA: "rgba(45,212,191,.28)",
      orbB: "rgba(148,163,184,.18)",
      headline: "Care that feels calm before you arrive.",
    };
  }
  if (c.includes("salon") || c.includes("beauty") || c.includes("hair")) {
    return {
      bg: "#faf7f2",
      ink: "#22181c",
      muted: "#6d5c63",
      accent: "#9f1239",
      accent2: "#4c0519",
      line: "rgba(34,24,28,.14)",
      display: '"Playfair Display"',
      body: '"Karla"',
      fontQuery: "family=Karla:wght@400;600;700&family=Playfair+Display:wght@500;700",
      heroBg:
        "radial-gradient(800px 500px at 70% 20%, #fda4af 0%, transparent 55%), linear-gradient(145deg,#1c1014 0%,#4c0519 50%,#292524 100%)",
      heroOverlay: "linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.55))",
      heroText: "#fff1f2",
      primaryText: "#fff",
      orbA: "rgba(251,113,133,.3)",
      orbB: "rgba(255,255,255,.08)",
      headline: "Your chair. Your look. Easy to book.",
    };
  }
  if (c.includes("restaurant") || c.includes("kitchen") || c.includes("cafe")) {
    return {
      bg: "#f7f3ec",
      ink: "#1c1917",
      muted: "#78716c",
      accent: "#b45309",
      accent2: "#431407",
      line: "rgba(28,25,23,.14)",
      display: '"Cormorant Garamond"',
      body: '"Manrope"',
      fontQuery:
        "family=Cormorant+Garamond:wght@500;700&family=Manrope:wght@400;600;700",
      heroBg:
        "radial-gradient(900px 600px at 20% 10%, #fdba74 0%, transparent 50%), linear-gradient(150deg,#1c1917 0%,#44403c 40%,#78350f 100%)",
      heroOverlay: "linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.6))",
      heroText: "#fff7ed",
      primaryText: "#fff7ed",
      orbA: "rgba(251,146,60,.28)",
      orbB: "rgba(255,255,255,.07)",
      headline: "Tables, taste, and tonight’s plan — in one place.",
    };
  }
  return {
    bg: "#f4f6f5",
    ink: "#14201c",
    muted: "#5f6f68",
    accent: "#0d9488",
    accent2: "#115e59",
    line: "rgba(20,32,28,.14)",
    display: '"Fraunces"',
    body: '"DM Sans"',
    fontQuery: "family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600;700",
    heroBg:
      "radial-gradient(900px 600px at 75% 0%, #5eead4 0%, transparent 50%), linear-gradient(150deg,#10201c 0%,#134e4a 55%,#1c1917 100%)",
    heroOverlay: "linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55))",
    heroText: "#f0fdfa",
    primaryText: "#042f2e",
    orbA: "rgba(45,212,191,.25)",
    orbB: "rgba(255,255,255,.08)",
    headline: "A proper website for a real local business.",
  };
}

function defaultServices(category: string): string[] {
  const c = category.toLowerCase();
  if (c.includes("salon") || c.includes("beauty"))
    return ["Cuts & styling", "Color", "Treatments", "Appointments"];
  if (c.includes("clinic") || c.includes("dental") || c.includes("physio"))
    return ["Consultations", "Treatments", "New patients", "Follow-ups"];
  if (c.includes("restaurant") || c.includes("cafe") || c.includes("kitchen"))
    return ["Dining", "Reservations", "Private events", "Takeaway enquiry"];
  if (c.includes("gym") || c.includes("fitness") || c.includes("yoga") || c.includes("tennis") || c.includes("sport"))
    return ["Court / class bookings", "Coaching", "Memberships", "Intro sessions"];
  return ["Core services", "Bookings", "Location", "Contact"];
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escape(s).replace(/'/g, "&#39;");
}

export function qaScoreHtml(
  html: string,
  facts: SiteFacts,
): { score: number; notes: string } {
  let score = 0;
  const notes: string[] = [];
  if (html.includes(facts.name)) score += 12;
  else notes.push("Missing business name");
  if (html.includes("viewport")) score += 8;
  else notes.push("Missing mobile viewport");
  if (/fonts\.googleapis|font-family:\s*["']?(Fraunces|Playfair|Libre|Cormorant)/i.test(html))
    score += 12;
  else notes.push("Weak typography");
  if (/min-height:\s*(100svh|100vh|78vh|85vh)/i.test(html)) score += 12;
  else notes.push("Hero not full-bleed enough");
  if (/@keyframes|animation:/i.test(html)) score += 10;
  else notes.push("No motion");
  if (html.includes("tel:") || /Call /i.test(html)) score += 8;
  else if (html.includes("mailto:") || /Email|Enquire/i.test(html))
    score += 8; // email-only contact still counts (e.g. community clubs)
  if (html.includes("mailto:") || /Email|Enquire/i.test(html)) score += 8;
  const hasMoney = /\$\d{2,}|£\d{2,}|A\$\d{2,}/.test(html);
  const attributedPublicPricing =
    /listed on their site|Copied from their public site|Membership \/ listed options/i.test(
      html,
    );
  if (!hasMoney || attributedPublicPricing) {
    score += 15;
    notes.push(
      attributedPublicPricing && hasMoney
        ? "Public listed pricing (attributed)"
        : "No invented prices",
    );
  } else notes.push("Possible invented prices");
  if (html.includes(facts.city)) score += 5;
  if (html.length > 5000) score += 10;
  else if (html.length > 3500) score += 5;
  else notes.push("Too thin for a pitch demo");
  if (/Personal demo|demo-banner|insomnia_Automaton/i.test(html)) score += 5;
  if (/data-service|enquiry|IntersectionObserver/i.test(html)) score += 5;
  if (/Inter|Roboto|Arial|system-ui/i.test(html) && !/DM Sans|Fraunces|Playfair/i.test(html)) {
    score -= 10;
    notes.push("Generic font stack");
  }
  return { score: Math.max(0, Math.min(100, score)), notes: notes.join("; ") };
}
