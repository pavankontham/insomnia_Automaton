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
  cafe: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  ],
  barber: [
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
  ],
  bakery: [
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
  ],
  painting: [
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  ],
};

export function photosForCategory(category: string): string[] {
  const c = category.toLowerCase();
  if (c.includes("barber") || c.includes("hair")) return NICHE_PHOTOS.barber;
  if (c.includes("bakery") || c.includes("bake")) return NICHE_PHOTOS.bakery;
  if (c.includes("paint") || c.includes("trade") || c.includes("contractor"))
    return NICHE_PHOTOS.painting;
  if (c.includes("cafe") || c.includes("café") || c.includes("coffee") || c.includes("restaurant"))
    return NICHE_PHOTOS.cafe;
  return NICHE_PHOTOS.cafe;
}

/**
 * Hand-researched dossiers — ONLY businesses verified with no dedicated website
 * (Facebook / Fresha / directory listings only). Public facts only.
 */
export const RESEARCHED_DOSSIERS: Record<string, ProspectDossier> = {
  "El's Cafe": {
    tagline: "Dog-friendly café with a proper bar — Carshalton",
    about:
      "El’s Cafe at 3 Nightingale Road, Carshalton is a classic British café with a twist: a real bar along one wall, spirit bottles in the window, a garden out back, and a warm welcome for dogs. Owner Elvis runs the place himself — English breakfast, strong tea, and regulars who know “the usual.”",
    address: "3 Nightingale Road, Carshalton, SM5 2DN, UK",
    phone: "+44 20 3158 9745",
    email: "elscafe1@icloud.com",
    hours: "Independent café hours — call or message for today’s opening times.",
    services: [
      "Full English breakfast",
      "Hot drinks & tea",
      "Café meals",
      "Dog-friendly seating",
      "Garden seating",
      "Bar / evening drinks",
    ],
    highlights: [
      "Featured in Your Local Guardian (dog-friendly café with bar)",
      "Owner-operated by Elvis",
      "No dedicated website — Facebook / listings only",
      "Registered company EL'S CAFE LTD (14617969)",
    ],
    social: [
      {
        label: "Facebook",
        url: "https://www.facebook.com/profile.php?id=100091838301804",
      },
    ],
    publicPricing: [
      {
        label: "English breakfast + tea",
        detail: "About £8 (reported in local press — confirm on visit)",
      },
    ],
    mapQuery: "3 Nightingale Road Carshalton SM5 2DN",
    photoQueries: ["cafe", "carshalton"],
    bookingHint: "Ask about breakfast, dog-friendly seating, or evening bar hours.",
    sourceUrls: [
      "https://www.yourlocalguardian.co.uk/news/25381937.els-cafe-carshalton-dog-friendly-cafe-bar/",
      "https://ratings.food.gov.uk/business/1620596/els-cafe/online-ratings",
      "https://find-and-update.company-information.service.gov.uk/company/14617969",
    ],
  },
  "Cassidy's Cafe LLC": {
    tagline: "Homemade breakfast, lunch, dinner — downtown Wabeno",
    about:
      "Cassidy’s Cafe LLC is a family-style restaurant at 4453 N Branch Street in downtown Wabeno, Wisconsin. About 90% of the menu is homemade — breakfast through dinner, Friday all-you-can-eat fish fry, Saturday steak specials, daily specials, and catering.",
    address: "4453 N Branch Street, Wabeno, WI 54566, USA",
    phone: "+1 715-889-1784",
    email: "cassidyscafe15@yahoo.com",
    hours: "Call for today’s hours and specials — listed on Facebook.",
    services: [
      "Breakfast, lunch & dinner",
      "Friday fish fry",
      "Saturday steak specials",
      "Daily homemade specials",
      "Catering",
      "Dine-in & pickup",
    ],
    highlights: [
      "Listed on Travel Wisconsin",
      "Facebook is the main web presence (no dedicated site)",
      "~1.5K Facebook followers, strong local reviews",
    ],
    social: [
      { label: "Facebook", url: "https://www.facebook.com/cassidyscafe/" },
      {
        label: "Travel Wisconsin",
        url: "https://www.travelwisconsin.com/food-drink/restaurants/cassidy-s-cafe-llc",
      },
    ],
    mapQuery: "4453 N Branch Street Wabeno WI 54566",
    photoQueries: ["cafe", "wisconsin"],
    bookingHint: "Ask about today’s specials, fish fry, or catering.",
    sourceUrls: [
      "https://www.facebook.com/cassidyscafe/",
      "https://www.travelwisconsin.com/food-drink/restaurants/cassidy-s-cafe-llc",
    ],
  },
  "Mr Barber": {
    tagline: "Neighbourhood barbershop on Hanover Road, Rowley Regis",
    about:
      "Mr Barber (MR BARBER LTD) is a well-reviewed barbershop at 71 Hanover Road, Rowley Regis B65 9EE. Walk-ins and family-friendly cuts — parents praise them for kids’ hair. Online presence is Facebook plus a Fresha listing; no branded website.",
    address: "71 Hanover Road, Rowley Regis, B65 9EE, UK",
    phone: "+44 7592 105188",
    email: "mrbarber.rowley@gmail.com",
    hours: "Mon–Thu 9:00–19:00 · Fri 9:00–19:30 · Sat 8:30–17:30 · Sun closed",
    services: [
      "Men’s haircuts",
      "Kids’ cuts",
      "Beard / fade styling",
      "Walk-in friendly service",
    ],
    highlights: [
      "4.8★ from 70+ public reviews",
      "Companies House: MR BARBER LTD (13533265)",
      "No dedicated website — Facebook / Fresha only",
    ],
    social: [
      {
        label: "Fresha listing",
        url: "https://www.fresha.com/lvp/mr-barber-barbershop-hanover-road-gnGYz7",
      },
    ],
    mapQuery: "71 Hanover Road Rowley Regis B65 9EE",
    photoQueries: ["barber", "uk"],
    bookingHint: "Ask for a walk-in slot or kids’ cut — no booking required on many days.",
    sourceUrls: [
      "https://www.fresha.com/lvp/mr-barber-barbershop-hanover-road-gnGYz7",
      "https://datalog.co.uk/browse/detail.php/CompanyNumber/13533265/MR+BARBER+LTD",
    ],
  },
  "Ozzy Barber Shop": {
    tagline: "Walk-in barbershop in Springfield, Chelmsford",
    about:
      "Ozzy Barber Shop is a walk-in barbershop at 5 Havengore, Springfield, Chelmsford (CM1 6JP area). Open six days, free car park nearby, patient with kids, and Facebook-first online — no dedicated website.",
    address: "5 Havengore, Springfield, Chelmsford, CM1 6JP, UK",
    phone: "+44 7576 800889",
    email: "haydar.335@hotmail.com",
    hours: "Monday–Saturday 9:00–19:00 · Sunday closed · walk-ins welcome",
    services: [
      "Men’s & boys’ haircuts",
      "Walk-in cuts",
      "Fades & classic styles",
      "Family-friendly appointments",
    ],
    highlights: [
      "5★ public reviews mentioning kids’ patience",
      "Free car park mentioned on listings",
      "Web presence = Facebook only",
    ],
    social: [
      {
        label: "Facebook",
        url: "https://www.facebook.com/208146205724845",
      },
    ],
    mapQuery: "5 Havengore Chelmsford CM1 6JP",
    photoQueries: ["barber", "chelmsford"],
    bookingHint: "Walk-in or call/text to check wait times.",
    sourceUrls: [
      "https://www.beautynailhairsalons.com/GB/Chelmsford/208146205724845/OZZY-Barber-Shop",
      "https://www.facebook.com/208146205724845",
    ],
  },
  "Baker's Diary": {
    tagline: "Neighbourhood bakery on Rosebank Road, Avondale",
    about:
      "Baker’s Diary is a highly rated bakery at 448 Rosebank Road, Avondale, Auckland. Fresh bakes for the local community — Facebook is the shopfront online; no dedicated website found.",
    address: "448 Rosebank Road, Avondale, Auckland 1026, New Zealand",
    phone: "+64 27 501 2613",
    email: "bakersdiarynz@gmail.com",
    hours: "Check Facebook for today’s bake list and opening hours.",
    services: [
      "Fresh bread & pastries",
      "Cakes & sweet bakes",
      "Savoury bakery items",
      "Local pickup",
    ],
    highlights: [
      "4.7★ from 175+ public reviews",
      "Facebook-first presence (no dedicated site)",
      "Avondale / Rosebank Road neighbourhood bakery",
    ],
    social: [
      { label: "Facebook", url: "https://www.facebook.com/bakersdiarynz/" },
    ],
    mapQuery: "448 Rosebank Road Avondale Auckland 1026",
    photoQueries: ["bakery", "auckland"],
    bookingHint: "Ask about today’s bakes, cake orders, or pickup timing.",
    sourceUrls: ["https://www.facebook.com/bakersdiarynz/"],
  },
};
