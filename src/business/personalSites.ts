import {
  photosForCategory,
  type ProspectDossier,
} from "@/business/dossier";
import type { SiteFacts } from "@/business/sites";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return esc(s).replace(/'/g, "&#39;");
}

/** Personal, interactive, single-file demo — facts from researched dossier. */
export function buildPersonalInteractiveHtml(
  facts: SiteFacts,
  dossier: ProspectDossier,
): string {
  const photos = photosForCategory(facts.category);
  const hero = photos[0];
  const gallery = photos.slice(1);
  const phone = dossier.phone || facts.phone || "";
  const email = dossier.email || facts.email || "";
  const mapQ = encodeURIComponent(
    dossier.mapQuery || `${facts.name} ${facts.city} ${facts.country}`,
  );
  const services = dossier.services.length
    ? dossier.services
    : facts.services || [];
  const theme = themeFor(facts.category);

  const addrBlocks = dossier.addresses?.length
    ? dossier.addresses
        .map(
          (a) =>
            `<button type="button" class="loc-tab" data-loc="${escAttr(a.line)}"><strong>${esc(a.label)}</strong><span>${esc(a.line)}</span></button>`,
        )
        .join("")
    : dossier.address
      ? `<button type="button" class="loc-tab active" data-loc="${escAttr(dossier.address)}"><strong>Visit</strong><span>${esc(dossier.address)}</span></button>`
      : "";

  const pricing = dossier.publicPricing?.length
    ? `<section id="membership" class="panel">
        <h2>Membership / listed options</h2>
        <p class="sub">Copied from their public site — not invented.</p>
        <div class="price-grid">
          ${dossier.publicPricing
            .map(
              (p) =>
                `<button type="button" class="price-card" data-plan="${escAttr(p.label)}"><em>${esc(p.label)}</em><span>${esc(p.detail)}</span></button>`,
            )
            .join("")}
        </div>
        <p class="hint" id="planHint">Tap a plan to prefill your enquiry.</p>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(facts.name)} · ${esc(facts.city)} — personal demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?${theme.fonts}&display=swap" rel="stylesheet"/>
<style>
:root{--ink:${theme.ink};--muted:${theme.muted};--bg:${theme.bg};--accent:${theme.accent};--line:${theme.line};--display:${theme.display};--body:${theme.body};--heroText:${theme.heroText}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:var(--body),sans-serif;color:var(--ink);background:var(--bg)}
.demo-banner{position:sticky;top:0;z-index:40;background:#0b0f0e;color:#f4f1ea;font:600 .75rem/1.35 var(--body),sans-serif;letter-spacing:.04em;padding:.55rem 1rem;text-align:center}
.nav{position:sticky;top:2rem;z-index:30;display:flex;gap:.5rem;flex-wrap:wrap;padding:.65rem clamp(1rem,3vw,2.5rem);background:rgba(255,255,255,.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav a{color:var(--ink);text-decoration:none;font:600 .85rem/1 var(--body),sans-serif;padding:.55rem .8rem;border-radius:999px}
.nav a:hover,.nav a.active{background:var(--accent);color:#fff}
.hero{min-height:100svh;display:grid;align-content:end;position:relative;color:var(--heroText);padding:clamp(1.5rem,5vw,4rem);overflow:hidden}
.hero-photo{position:absolute;inset:0;background:center/cover no-repeat url('${hero}');transform:scale(1.04);animation:ken 18s ease-in-out infinite alternate}
.hero-veil{position:absolute;inset:0;background:${theme.veil}}
.hero-inner{position:relative;z-index:2;max-width:70rem}
.brand{font-family:var(--display),serif;font-size:clamp(3rem,9vw,6.4rem);line-height:.9;letter-spacing:-.035em;margin:0;max-width:14ch;animation:rise .85s ease both}
.tag{font-family:var(--display),serif;font-size:clamp(1.25rem,2.6vw,1.85rem);margin:1rem 0 .55rem;max-width:28ch;animation:rise .95s .08s ease both}
.lede{max-width:40ch;opacity:.94;margin:0 0 1.4rem;animation:rise 1s .14s ease both}
.cta{display:flex;flex-wrap:wrap;gap:.7rem;animation:rise 1.05s .2s ease both}
.btn{border:0;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;padding:.95rem 1.25rem;border-radius:999px;font:700 .92rem var(--body),sans-serif}
.btn.primary{background:var(--accent);color:#fff}
.btn.ghost{background:transparent;color:inherit;border:1px solid currentColor}
main{padding:clamp(2rem,5vw,4rem) clamp(1rem,3vw,2.5rem);display:grid;gap:2.75rem;max-width:70rem;margin:0 auto}
.panel h2{font-family:var(--display),serif;font-size:clamp(1.7rem,3.5vw,2.4rem);margin:0 0 .4rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0 0 1.2rem;max-width:50ch}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:.45rem .85rem;font:600 .82rem var(--body),sans-serif;cursor:pointer}
.chip.on,.chip:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.service-list{display:grid;gap:0;border-top:1px solid var(--line)}
.service-list li{list-style:none;padding:1rem 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:1rem;align-items:center}
.service-list button{border:0;background:transparent;color:var(--accent);font:700 .85rem var(--body),sans-serif;cursor:pointer}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem}
.gallery figure{margin:0;border-radius:1rem;overflow:hidden;aspect-ratio:4/3;position:relative}
.gallery img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
.gallery figure:hover img{transform:scale(1.04)}
.gallery figcaption{position:absolute;left:0;right:0;bottom:0;padding:.6rem .8rem;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff;font-size:.78rem}
.photo-note{font-size:.78rem;color:var(--muted);margin:.6rem 0 0}
.loc-tabs{display:grid;gap:.6rem}
.loc-tab{text-align:left;border:1px solid var(--line);background:#fff;border-radius:1rem;padding:1rem 1.1rem;cursor:pointer;display:grid;gap:.25rem}
.loc-tab.active,.loc-tab:hover{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)}
.loc-tab span{color:var(--muted);font-size:.9rem}
.price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.7rem}
.price-card{border:1px solid var(--line);background:#fff;border-radius:1rem;padding:1rem;text-align:left;cursor:pointer;display:grid;gap:.35rem}
.price-card em{font-family:var(--display),serif;font-style:normal;font-size:1.15rem}
.price-card.active{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 8%, #fff)}
.hint{color:var(--muted);font-size:.85rem}
.contact-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:1.25rem}
@media (max-width:800px){.contact-grid{grid-template-columns:1fr}}
form{display:grid;gap:.7rem;background:#fff;border:1px solid var(--line);border-radius:1.1rem;padding:1.1rem}
label{display:grid;gap:.3rem;font:600 .82rem var(--body),sans-serif;color:var(--muted)}
input,select,textarea{width:100%;border:1px solid var(--line);border-radius:.7rem;padding:.75rem .85rem;font:400 1rem var(--body),sans-serif;color:var(--ink);background:#fafafa}
textarea{min-height:110px;resize:vertical}
.toast{display:none;padding:.85rem 1rem;border-radius:.8rem;background:#064e3b;color:#ecfdf5;font:600 .9rem var(--body),sans-serif}
.toast.show{display:block;animation:rise .4s ease both}
.faq details{border-top:1px solid var(--line);padding:.85rem 0}
.faq summary{cursor:pointer;font-weight:700}
.sticky-cta{position:fixed;right:1rem;bottom:1rem;z-index:35;display:flex;gap:.5rem}
footer{padding:2rem clamp(1rem,3vw,2.5rem) 5rem;color:var(--muted);font-size:.85rem;border-top:1px solid var(--line)}
@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ken{from{transform:scale(1.02)}to{transform:scale(1.08)}}
</style>
</head>
<body>
<div class="demo-banner">Personal demo for ${esc(facts.name)} · researched public facts · insomnia_Automaton · not affiliated until you approve &amp; pay</div>
<nav class="nav" aria-label="Sections">
  <a href="#about">About</a>
  <a href="#services">Services</a>
  <a href="#gallery">Atmosphere</a>
  <a href="#visit">Visit</a>
  ${dossier.publicPricing?.length ? '<a href="#membership">Plans</a>' : ""}
  <a href="#contact">Enquire</a>
</nav>
<header class="hero">
  <div class="hero-photo" role="img" aria-label="Atmospheric ${esc(facts.category)} imagery"></div>
  <div class="hero-veil"></div>
  <div class="hero-inner">
    <h1 class="brand">${esc(facts.name)}</h1>
    <p class="tag">${esc(dossier.tagline)}</p>
    <p class="lede">${esc(dossier.about)}</p>
    <div class="cta">
      ${phone ? `<a class="btn primary" href="tel:${escAttr(phone)}">Call ${esc(phone)}</a>` : ""}
      ${email ? `<a class="btn ghost" href="mailto:${escAttr(email)}">Email</a>` : `<a class="btn ghost" href="#contact">Enquire</a>`}
      <a class="btn ghost" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">Map</a>
    </div>
  </div>
</header>
<main>
  <section id="about" class="panel">
    <h2>Made for ${esc(facts.name)}</h2>
    <p class="sub">${esc(dossier.about)}</p>
    <ul class="service-list">
      ${dossier.highlights.map((h) => `<li><span>${esc(h)}</span><span></span></li>`).join("")}
    </ul>
  </section>

  <section id="services" class="panel">
    <h2>Services</h2>
    <p class="sub">Filter what you care about — then enquire. No invented prices.</p>
    <div class="chips" id="chips">
      <button type="button" class="chip on" data-filter="all">All</button>
      ${services
        .slice(0, 6)
        .map(
          (s) =>
            `<button type="button" class="chip" data-filter="${escAttr(s.toLowerCase())}">${esc(s.split(" ")[0])}</button>`,
        )
        .join("")}
    </div>
    <ul class="service-list" id="serviceList">
      ${services
        .map(
          (s) =>
            `<li data-tags="${escAttr(s.toLowerCase())}"><span>${esc(s)}</span><button type="button" data-service="${escAttr(s)}">Enquire</button></li>`,
        )
        .join("")}
    </ul>
  </section>

  <section id="gallery" class="panel">
    <h2>Atmosphere</h2>
    <p class="sub">Neighborhood / category photography to show the feel — not claimed as ${esc(facts.name)}’s own photos.</p>
    <div class="gallery">
      ${[hero, ...gallery]
        .map(
          (src, i) =>
            `<figure><img src="${src}" alt="Atmosphere ${i + 1} for ${esc(facts.category)} in ${esc(facts.city)}" loading="${i ? "lazy" : "eager"}"/><figcaption>${esc(facts.city)} · ${esc(facts.category)}</figcaption></figure>`,
        )
        .join("")}
    </div>
    <p class="photo-note">Stock atmosphere via Unsplash. Final paid site can use your real photos &amp; brand assets.</p>
  </section>

  <section id="visit" class="panel">
    <h2>Visit &amp; hours</h2>
    <p class="sub">${esc(dossier.hours || "Contact for current hours.")}</p>
    <div class="loc-tabs" id="locTabs">${addrBlocks}</div>
    <p style="margin-top:1rem"><a class="btn primary" id="mapBtn" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">Open in Google Maps</a></p>
  </section>

  ${pricing}

  <section id="contact" class="panel contact-grid">
    <div>
      <h2>Enquire</h2>
      <p class="sub">${esc(dossier.bookingHint)}</p>
      ${phone ? `<p><strong>Phone</strong><br/><a href="tel:${escAttr(phone)}">${esc(phone)}</a></p>` : ""}
      ${email ? `<p><strong>Email</strong><br/><a href="mailto:${escAttr(email)}">${esc(email)}</a></p>` : ""}
      ${(dossier.social || [])
        .map(
          (s) =>
            `<p><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></p>`,
        )
        .join("")}
      <div class="faq">
        <details><summary>Is this the live ${esc(facts.name)} site?</summary><p>No — this is a personal demo by insomnia_Automaton using public facts, to show what a clearer site could feel like.</p></details>
        <details open><summary>Where did the facts come from?</summary><p>${dossier.sourceUrls.map((u) => `<a href="${escAttr(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join("<br/>")}</p></details>
      </div>
    </div>
    <form id="enquiry" novalidate>
      <label>Your name<input name="name" required placeholder="Alex Rivera"/></label>
      <label>Your email<input name="email" type="email" required placeholder="you@email.com"/></label>
      <label>Interest
        <select name="interest" id="interest">
          <option value="">Choose…</option>
          ${services.map((s) => `<option value="${escAttr(s)}">${esc(s)}</option>`).join("")}
          <option value="General enquiry">General enquiry</option>
        </select>
      </label>
      <label>Message<textarea name="message" id="message" placeholder="${esc(dossier.bookingHint)}"></textarea></label>
      <button class="btn primary" type="submit">Preview send (mailto)</button>
      <div class="toast" id="toast" role="status"></div>
      <p class="hint">Interactive demo form — opens your mail app to ${email ? esc(email) : "the business"}. No data is stored on this demo host.</p>
    </form>
  </section>
</main>
<div class="sticky-cta">
  ${phone ? `<a class="btn primary" href="tel:${escAttr(phone)}">Call</a>` : ""}
  <a class="btn primary" href="#contact">Enquire</a>
</div>
<footer>
  Personal demo for <strong>${esc(facts.name)}</strong> (${esc(facts.city)}, ${esc(facts.country)}).
  Built by insomnia_Automaton from public sources. Not affiliated until the owner accepts and pays.
</footer>
<script>
(function(){
  const interest = document.getElementById('interest');
  const message = document.getElementById('message');
  const toast = document.getElementById('toast');
  const mapBtn = document.getElementById('mapBtn');
  document.querySelectorAll('[data-service]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(interest){ interest.value = btn.getAttribute('data-service') || ''; }
      if(message && !message.value){ message.value = 'I am interested in: ' + (btn.getAttribute('data-service')||''); }
      document.getElementById('contact').scrollIntoView({behavior:'smooth'});
    });
  });
  document.querySelectorAll('.price-card').forEach(card=>{
    card.addEventListener('click',()=>{
      document.querySelectorAll('.price-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
      const plan = card.getAttribute('data-plan')||'';
      const hint = document.getElementById('planHint');
      if(hint) hint.textContent = 'Selected: ' + plan + ' — prefilled in enquiry.';
      if(interest){
        let opt=[...interest.options].find(o=>o.value.toLowerCase().includes('member'));
        if(opt) interest.value = opt.value;
      }
      if(message) message.value = 'I am interested in the "' + plan + '" option listed on your site.';
    });
  });
  const tabs=[...document.querySelectorAll('.loc-tab')];
  tabs.forEach((tab,i)=>{
    if(i===0) tab.classList.add('active');
    tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const loc=tab.getAttribute('data-loc')||'';
      if(mapBtn) mapBtn.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(loc);
    });
  });
  const chips=[...document.querySelectorAll('#chips .chip')];
  const items=[...document.querySelectorAll('#serviceList li')];
  chips.forEach(chip=>{
    chip.addEventListener('click',()=>{
      chips.forEach(c=>c.classList.remove('on'));
      chip.classList.add('on');
      const f=chip.getAttribute('data-filter')||'all';
      items.forEach(li=>{
        const tags=li.getAttribute('data-tags')||'';
        li.style.display = (f==='all' || tags.includes(f)) ? '' : 'none';
      });
    });
  });
  const form=document.getElementById('enquiry');
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    const name=(fd.get('name')||'').toString().trim();
    const em=(fd.get('email')||'').toString().trim();
    const int=(fd.get('interest')||'').toString();
    const msg=(fd.get('message')||'').toString();
    if(!name || !em || !em.includes('@')){
      toast.textContent='Please add a valid name and email.';
      toast.classList.add('show');
      return;
    }
    const body = 'From: '+name+' <'+em+'>\\nInterest: '+int+'\\n\\n'+msg;
    const to=${email ? JSON.stringify(email) : '""'};
    if(to){
      window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent('Enquiry via demo — '+int)+'&body='+encodeURIComponent(body);
    }
    toast.textContent='Enquiry ready'+(to?' — mail app opening to '+to:'')+'.';
    toast.classList.add('show');
  });
  const navLinks=[...document.querySelectorAll('.nav a')];
  const sections=navLinks.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      const id='#'+en.target.id;
      navLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href')===id));
    });
  },{rootMargin:'-40% 0px -50% 0px',threshold:0.01});
  sections.forEach(s=>io.observe(s));
})();
</script>
</body>
</html>`;
}

function themeFor(category: string) {
  const c = category.toLowerCase();
  if (c.includes("tennis") || c.includes("sport")) {
    return {
      ink: "#1a2118",
      muted: "#5c6558",
      bg: "#f3efe6",
      accent: "#c45c26",
      line: "rgba(26,33,24,.14)",
      display: '"Fraunces"',
      body: '"DM Sans"',
      fonts: "family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600;700",
      heroText: "#f6f1e7",
      veil: "linear-gradient(180deg,rgba(12,28,20,.35),rgba(12,28,20,.78))",
    };
  }
  if (c.includes("dental")) {
    return {
      ink: "#152028",
      muted: "#5b6b75",
      bg: "#f5f7f8",
      accent: "#0f766e",
      line: "rgba(21,32,40,.12)",
      display: '"Libre Baskerville"',
      body: '"Source Sans 3"',
      fonts:
        "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700",
      heroText: "#ecfeff",
      veil: "linear-gradient(180deg,rgba(11,28,36,.25),rgba(11,28,36,.75))",
    };
  }
  if (c.includes("physio")) {
    return {
      ink: "#152028",
      muted: "#5b6b75",
      bg: "#f4f7f6",
      accent: "#0d9488",
      line: "rgba(21,32,40,.12)",
      display: '"Libre Baskerville"',
      body: '"Source Sans 3"',
      fonts:
        "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700",
      heroText: "#f0fdfa",
      veil: "linear-gradient(180deg,rgba(15,40,40,.3),rgba(15,40,40,.75))",
    };
  }
  return {
    ink: "#22181c",
    muted: "#6d5c63",
    bg: "#faf7f2",
    accent: "#9f1239",
    line: "rgba(34,24,28,.12)",
    display: '"Playfair Display"',
    body: '"Karla"',
    fonts: "family=Karla:wght@400;600;700&family=Playfair+Display:wght@500;700",
    heroText: "#fff1f2",
    veil: "linear-gradient(180deg,rgba(40,10,20,.3),rgba(40,10,20,.75))",
  };
}
