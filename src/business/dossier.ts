export type ProspectDossier = {
  tagline: string;
  about: string;
  address?: string;
  addresses?: { label: string; line: string }[];
  phone?: string;
  email?: string;
  hours?: string;
  services: string[];
  highlights: string[];
  social?: { label: string; url: string }[];
  publicPricing?: { label: string; detail: string }[];
  mapQuery?: string;
  photoQueries: string[]; // used to pick atmospheric stock matching the niche/place
  bookingHint: string;
  sourceUrls: string[];
};

/** Curated Unsplash photo IDs — atmospheric, niche-matched (not claimed as business photos). */
export const NICHE_PHOTOS: Record<string, string[]> = {
  tennis: [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80",
  ],
  dental: [
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1606811841689-23dfdb7ee46b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
  ],
  physio: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
  ],
  yoga: [
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=1200&q=80",
  ],
};

export function photosForCategory(category: string): string[] {
  const c = category.toLowerCase();
  if (c.includes("tennis") || c.includes("sport") || c.includes("racquet"))
    return NICHE_PHOTOS.tennis;
  if (c.includes("dental")) return NICHE_PHOTOS.dental;
  if (c.includes("physio")) return NICHE_PHOTOS.physio;
  if (c.includes("yoga") || c.includes("salon")) return NICHE_PHOTOS.yoga;
  return NICHE_PHOTOS.yoga;
}

/** Hand-researched dossiers for current prospects (public facts only). */
export const RESEARCHED_DOSSIERS: Record<string, ProspectDossier> = {
  "Austin Tennis Club": {
    tagline: "Tennis + community for Austin’s LGBT players and friends",
    about:
      "Austin Tennis Club (ATC) is a non-profit promoting tennis and social activities among the Austin-area LGBT community. Membership is open to any adult who endorses ATC’s purposes — beginners through experts welcome.",
    addresses: [
      {
        label: "Tuesday social tennis",
        line: "Austin Tennis Center — 7800 Johnny Morris Rd, Austin, TX 78724",
      },
      {
        label: "Friday social tennis",
        line: "South Austin Tennis Center — 1000 Cumberland Rd, Austin, TX 78704",
      },
    ],
    email: "umpire@austintennisclub.org",
    hours: "Social tennis nights at partner courts (Tue / Fri). Facility hours vary by tennis center.",
    services: [
      "Social tennis nights",
      "Membership directory & ladders",
      "Year-round social events",
      "Beginner → expert welcome",
    ],
    highlights: [
      "Non-profit, community-first",
      "Three membership levels (free → full-year)",
      "Instagram @AustinTennisClub",
    ],
    social: [
      { label: "Instagram", url: "https://www.instagram.com/austintennisclub" },
      { label: "Website", url: "https://www.austintennisclub.org" },
    ],
    publicPricing: [
      { label: "Free membership", detail: "Pay as you play" },
      { label: "Half-year", detail: "$75 / half-year (listed on their site)" },
      { label: "Full-year", detail: "$150 / full-year (listed on their site)" },
    ],
    mapQuery: "Austin Tennis Center 7800 Johnny Morris Rd Austin TX",
    photoQueries: ["tennis", "austin"],
    bookingHint: "Ask about membership or the next social tennis night.",
    sourceUrls: [
      "https://www.austintennisclub.org/",
      "https://www.austintennisclub.org/contact",
      "https://www.austintennisclub.org/membership",
    ],
  },
  "Brighton Dental Clinic": {
    tagline: "City-centre dentistry on Old Steine",
    about:
      "Brighton Dental Clinic serves patients from St James’s Mansions on Old Steine in Brighton city centre, with online booking and WhatsApp options for appointments.",
    address: "St James’s Mansions, Old Steine, Brighton, BN1 1EN, UK",
    phone: "+44 1273 570 700",
    email: "smile@brightondentalclinic.co.uk",
    hours: "Contact the practice for current surgery hours.",
    services: [
      "General dentistry",
      "Orthodontics",
      "Periodontics / gum care",
      "Online appointment booking",
    ],
    highlights: [
      "WhatsApp: 07312 198 460",
      "Practice owner Dr Ilias Tzampazis",
      "City-centre Old Steine location",
    ],
    social: [
      { label: "Book online", url: "https://www.brightondentalclinic.co.uk/book" },
      { label: "Website", url: "https://www.brightondentalclinic.co.uk" },
    ],
    mapQuery: "St James's Mansions Old Steine Brighton BN1 1EN",
    photoQueries: ["dental", "brighton"],
    bookingHint: "Request a checkup or specialist consult — we’ll mirror your preferred channel.",
    sourceUrls: [
      "https://www.brightondentalclinic.co.uk/contact",
      "https://www.brightondentalclinic.co.uk/book",
    ],
  },
  "Melbourne Physio Clinic": {
    tagline: "Physiotherapy in the Dome Building, Collins Street CBD",
    about:
      "Melbourne Physio Clinic is on Level 14, 333 Collins Street in the historic Dome Building — sports and musculoskeletal physio, rehab, ergonomics, and telehealth for CBD and beyond.",
    address: "Level 14 / 333 Collins Street, Melbourne VIC 3000, Australia",
    phone: "+61 3 9069 0005",
    email: "info@melbournephysioclinic.com.au",
    hours: "CBD clinic — contact reception for appointment times. Telehealth available.",
    services: [
      "Sports & musculoskeletal physio",
      "Post-surgical rehabilitation",
      "Running / bike / gym technique analysis",
      "Ergonomic assessments",
      "Telehealth consultations",
      "Pre & postpartum care",
    ],
    highlights: [
      "Between Elizabeth St & Queen St (south side)",
      "Nearest train: Flinders Street (~300m)",
      "Trams 31, 48, 109, 112 on Collins St",
    ],
    social: [
      { label: "Book / contact", url: "https://www.melbournephysioclinic.com.au/contact" },
      { label: "Website", url: "https://www.melbournephysioclinic.com.au" },
    ],
    mapQuery: "333 Collins Street Melbourne VIC 3000",
    photoQueries: ["physiotherapy", "melbourne"],
    bookingHint: "Book a consult or telehealth — mention your injury or sport.",
    sourceUrls: [
      "https://www.melbournephysioclinic.com.au/",
      "https://www.melbournephysioclinic.com.au/contact",
    ],
  },
  "Canopy Yoga": {
    tagline: "Boutique yoga + smoothie bar in LoHi, Denver",
    about:
      "Canopy Yoga is a boutique studio and smoothie bar at 2525 15th Street in Denver’s Highland / LoHi area — Vinyasa (lightly infrared heated), Vin/Yin, Kundalini, prenatal, candlelit yin, breathwork, and Baby & Me.",
    address: "2525 15th Street, Unit 1D, Denver, CO 80211, USA",
    phone: "+1 303-381-0197",
    email: "hello@canopyyoga.com",
    hours: "Class-based schedule (e.g. midday + late afternoon/evening blocks). Check the studio app or site for today’s times.",
    services: [
      "Vinyasa Flow (heated ~80–85°F)",
      "Vin / Yin",
      "Kundalini",
      "Prenatal yoga",
      "Candlelit Yin",
      "Breathwork & Baby & Me",
      "In-studio smoothie bar",
    ],
    highlights: [
      "Spa-like boutique studio aesthetic",
      "Dedicated booking app (Canopy Yoga)",
      "LoHi / Highland location",
    ],
    social: [
      { label: "Website", url: "https://www.canopyyoga.com" },
    ],
    mapQuery: "2525 15th Street Unit 1D Denver CO 80211",
    photoQueries: ["yoga", "denver"],
    bookingHint: "Reserve a mat or ask about intro / prenatal options.",
    sourceUrls: ["https://www.canopyyoga.com/"],
  },
  "Yoga Center of Denver": {
    tagline: "Come for a class — leave as a friend",
    about:
      "Yoga Center of Denver is a holistic hub on South Broadway with Iyengar, Vinyasa, Yin, aerial, family, prenatal, and more — plus an in-house Prana Spa for massage and Ayurveda-inspired care.",
    address: "770 S Broadway, Denver, CO 80209, USA",
    phone: "+1 303-865-9642",
    email: "info@yogacenterdenver.com",
    hours: "Front desk available during studio hours — call or email for today’s class board.",
    services: [
      "Iyengar, Vinyasa, Yin, Gentle, Restorative",
      "Aerial / Acro / Ropes",
      "Pre & postnatal and kids classes",
      "Yoga teacher training Q&A",
      "Prana Spa (massage & healing arts)",
    ],
    highlights: [
      "Phone: 303-865-YOGA (9642)",
      "Community from beginners to advanced",
      "Spa + yoga under one roof",
    ],
    social: [
      { label: "Class schedule", url: "https://yogacenterdenver.com/class-schedule/" },
      { label: "Book", url: "https://yogacenterdenver.com/book-now/" },
      { label: "Website", url: "https://yogacenterdenver.com/" },
    ],
    mapQuery: "770 S Broadway Denver CO 80209",
    photoQueries: ["yoga studio", "denver"],
    bookingHint: "Pick a class style or spa service — front desk can guide first-timers.",
    sourceUrls: [
      "https://yogacenterdenver.com/contact-us/",
      "https://yogacenterdenver.com/",
    ],
  },
};
