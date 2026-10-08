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
};

export function buildDemoHtml(facts: SiteFacts): string {
  const services =
    facts.services?.length
      ? facts.services
      : defaultServices(facts.category);
  const phone = facts.phone || "Contact for number";
  const email = facts.email || "Contact via form";
  const hours = facts.hours || "Contact us for current hours";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escape(facts.name)} | ${escape(facts.city)}</title>
<style>
  :root { --ink:#14201c; --moss:#1f6f5b; --sand:#f3efe6; --clay:#c45c26; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Iowan Old Style", "Palatino Linotype", Palatino, serif; color:var(--ink); background:
    radial-gradient(1200px 600px at 10% -10%, #d9efe7 0%, transparent 55%),
    linear-gradient(180deg, #f7f3ea 0%, #e7efe9 100%); }
  header { min-height: 78vh; padding: 2rem clamp(1.2rem,4vw,4rem); display:flex; flex-direction:column; justify-content:flex-end;
    background: linear-gradient(120deg, rgba(20,32,28,.88), rgba(31,111,91,.55)),
    url('data:image/svg+xml,${encodeURIComponent(heroSvg(facts.category))}') center/cover; color:#f8f5ee; }
  .brand { font-size: clamp(2.4rem, 7vw, 4.8rem); letter-spacing: -0.03em; line-height: .95; max-width: 12ch; animation: rise .8s ease both; }
  .lede { max-width: 36ch; font-size: 1.15rem; margin: 1rem 0 1.5rem; opacity:.92; animation: rise .9s .1s ease both; }
  .cta { display:flex; gap:.75rem; flex-wrap:wrap; animation: rise 1s .15s ease both; }
  a.btn { text-decoration:none; padding:.85rem 1.2rem; border-radius:999px; font-family: ui-sans-serif, system-ui, sans-serif; font-weight:600; }
  .btn-primary { background: var(--clay); color:white; }
  .btn-ghost { border:1px solid rgba(255,255,255,.55); color:white; }
  main { padding: 3rem clamp(1.2rem,4vw,4rem); display:grid; gap:2.5rem; }
  section h2 { font-size:1.8rem; margin:0 0 .75rem; }
  .grid { display:grid; gap:1rem; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); }
  .item { padding:1rem 0; border-top:1px solid rgba(20,32,28,.15); font-family: ui-sans-serif, system-ui, sans-serif; }
  footer { padding: 2rem clamp(1.2rem,4vw,4rem); font-family: ui-sans-serif, system-ui, sans-serif; font-size:.9rem; opacity:.8; }
  .demo-banner { position:sticky; top:0; background:#14201c; color:#f3efe6; padding:.55rem 1rem; font-family: ui-sans-serif, system-ui, sans-serif; font-size:.85rem; z-index:5; }
  @keyframes rise { from { opacity:0; transform: translateY(12px);} to { opacity:1; transform:none; } }
</style>
</head>
<body>
<div class="demo-banner">Demo by insomnia_Automaton — facts only; pricing shown only when publicly known.</div>
<header>
  <div class="brand">${escape(facts.name)}</div>
  <p class="lede">${escape(facts.category)} in ${escape(facts.city)}, ${escape(facts.country)}. A clear home on the web for hours, services, and contact.</p>
  <div class="cta">
    <a class="btn btn-primary" href="tel:${escape(phone)}">Call</a>
    <a class="btn btn-ghost" href="mailto:${escape(email)}">Email</a>
  </div>
</header>
<main>
  <section>
    <h2>Services</h2>
    <div class="grid">
      ${services.map((s) => `<div class="item">${escape(s)}</div>`).join("")}
    </div>
  </section>
  <section>
    <h2>Hours & location</h2>
    <p>${escape(hours)}</p>
    <p>${escape(facts.city)}, ${escape(facts.country)}</p>
  </section>
  <section>
    <h2>Book / enquire</h2>
    <p>Prefer WhatsApp, phone, or email — whichever you already use with customers. ${escape(facts.note || "Contact for current pricing.")}</p>
  </section>
</main>
<footer>Generated demo · not affiliated until the business owner accepts and pays.</footer>
</body>
</html>`;
}

function defaultServices(category: string): string[] {
  const c = category.toLowerCase();
  if (c.includes("salon") || c.includes("beauty"))
    return ["Cuts & styling", "Color", "Treatments", "Appointments"];
  if (c.includes("clinic") || c.includes("dental") || c.includes("physio"))
    return ["Consultations", "Treatments", "New patients", "Insurance queries"];
  if (c.includes("restaurant") || c.includes("cafe"))
    return ["Menu highlights", "Reservations", "Catering", "Private events"];
  if (c.includes("gym") || c.includes("fitness") || c.includes("yoga"))
    return ["Classes", "Memberships", "Personal training", "Intro sessions"];
  return ["Core services", "Bookings", "Location", "Contact"];
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function heroSvg(category: string): string {
  const tone = category.toLowerCase().includes("sport") ? "#1f6f5b" : "#2a4a5a";
  return `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
  <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
  <stop stop-color='${tone}'/><stop offset='1' stop-color='#0e1a17'/>
  </linearGradient></defs>
  <rect width='1600' height='900' fill='url(#g)'/>
  <circle cx='1200' cy='200' r='220' fill='rgba(255,255,255,.06)'/>
  <circle cx='300' cy='700' r='280' fill='rgba(196,92,38,.12)'/>
  </svg>`;
}

export function qaScoreHtml(html: string, facts: SiteFacts): { score: number; notes: string } {
  let score = 0;
  const notes: string[] = [];
  if (html.includes(facts.name)) {
    score += 20;
  } else notes.push("Missing business name");
  if (html.includes("viewport")) {
    score += 15;
  } else notes.push("Missing mobile viewport");
  if (html.includes("tel:") || html.includes("Call")) {
    score += 15;
  } else notes.push("Missing call CTA");
  if (html.includes("mailto:") || html.includes("Email")) {
    score += 10;
  } else notes.push("Missing email CTA");
  if (!/\$\d{2,}/.test(html) && !/£\d{2,}/.test(html)) {
    score += 20;
    notes.push("No invented prices (good)");
  } else {
    notes.push("Possible invented prices — review");
  }
  if (html.includes(facts.city)) score += 10;
  if (html.length > 800) score += 10;
  return { score: Math.min(100, score), notes: notes.join("; ") };
}
