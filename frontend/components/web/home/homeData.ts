/**
 * Static marketing content — Amber homepage layout, Skoun product truth.
 */

export const SEARCH_HINTS = ["Area", "University", "Landmark"] as const;

export const POPULAR_SEARCHES = [
  "Achrafieh",
  "Hamra",
  "AUB",
  "Mar Mikhael",
  "Jounieh",
  "LAU",
] as const;

export const HERO = {
  /** Short emotional line — Amber's "Home away from home" slot */
  title: "Home in Lebanon",
  subtitle:
    "Browse rooms and apartments by neighborhood or campus — then message posters on WhatsApp.",
  chips: [
    { id: "utilities", label: "Utility badges that matter", icon: "flash-outline" as const },
    { id: "whatsapp", label: "Direct WhatsApp contact", icon: "logo-whatsapp" as const },
    { id: "campus", label: "Near campus or by area", icon: "school-outline" as const },
  ],
  searchPlaceholder: "Search by area, university, or landmark",
  heroImage:
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=80",
} as const;

/** Insights strip — Amber order: immediately under hero (beds / unis / cities + trust) */
export const STATS = [
  {
    id: "listings",
    value: "Live listings",
    body: "Rooms, studios, and apartments across Lebanon — priced in USD.",
    icon: "home-outline" as const,
  },
  {
    id: "unis",
    value: "10+ campuses",
    body: "Sort by distance to AUB, LAU, USJ, and other gates that matter.",
    icon: "school-outline" as const,
  },
  {
    id: "areas",
    value: "15+ areas",
    body: "Beirut corridors, coast towns, and student neighborhoods.",
    icon: "map-outline" as const,
  },
] as const;

export type AreaRegion = {
  id: string;
  label: string;
  areas: { name: string; image: string }[];
};

export const AREA_REGIONS: AreaRegion[] = [
  {
    id: "beirut",
    label: "Beirut",
    areas: [
      {
        name: "Achrafieh",
        image:
          "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Hamra",
        image:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Mar Mikhael",
        image:
          "https://images.unsplash.com/photo-1466442929976-97f336a657be?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Gemmayzeh",
        image:
          "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Ras Beirut",
        image:
          "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Verdun",
        image:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Badaro",
        image:
          "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Furn el Chebbak",
        image:
          "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Snoubra",
        image:
          "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Corniche",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Tariq el Jdide",
        image:
          "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=480&q=75",
      },
    ],
  },
  {
    id: "coast",
    label: "Coast & hills",
    areas: [
      {
        name: "Jounieh",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Byblos",
        image:
          "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Dbayeh",
        image:
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Broummana",
        image:
          "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Antelias",
        image:
          "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Jnah",
        image:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Kaslik",
        image:
          "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Zouk",
        image:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Aley",
        image:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Bhamdoun",
        image:
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=80",
      },
    ],
  },
  {
    id: "cities",
    label: "Cities",
    areas: [
      {
        name: "Tripoli",
        image:
          "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Saida",
        image:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Zahle",
        image:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Tyre",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=75",
      },
      {
        name: "Nabatieh",
        image:
          "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=480&q=80",
      },
      {
        name: "Baalbek",
        image:
          "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=480&q=75",
      },
    ],
  },
];

export type DemoListing = {
  id: string;
  title: string;
  area: string;
  priceUsd: number;
  tag?: string;
  utilities: string[];
  images: string[];
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "1",
    title: "Sunny 1BR near Sassine",
    area: "Achrafieh",
    priceUsd: 850,
    tag: "Solar",
    utilities: ["Solar", "Wi‑Fi", "Elevator"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=70",
      "https://images.unsplash.com/photo-1560448204-e02f11c3be0e?auto=format&fit=crop&w=600&q=70",
    ],
  },
  {
    id: "2",
    title: "Private room · shared flat",
    area: "Hamra",
    priceUsd: 420,
    tag: "Students",
    utilities: ["Ishtirak", "Wi‑Fi"],
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=70",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=70",
    ],
  },
  {
    id: "3",
    title: "Studio with sea breeze",
    area: "Ras Beirut",
    priceUsd: 700,
    utilities: ["Generator", "Tank water"],
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=70",
    ],
  },
  {
    id: "4",
    title: "Quiet 2BR · family building",
    area: "Verdun",
    priceUsd: 1100,
    tag: "24/7 elevator",
    utilities: ["Solar", "Well water", "Elevator"],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=70",
    ],
  },
  {
    id: "5",
    title: "New studio near campus road",
    area: "Jounieh",
    priceUsd: 550,
    utilities: ["Ishtirak", "Wi‑Fi UPS"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=70",
    ],
  },
  {
    id: "6",
    title: "Shared dorm bed · furnished",
    area: "Mar Mikhael",
    priceUsd: 280,
    tag: "Students only",
    utilities: ["Wi‑Fi", "Generator"],
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=70",
    ],
  },
];

export const RAIL_PILLS = [
  "Achrafieh",
  "Hamra",
  "Mar Mikhael",
  "Ras Beirut",
  "Verdun",
  "Jounieh",
  "Byblos",
  "Tripoli",
] as const;

export const TESTIMONIALS = [
  {
    id: "1",
    quote:
      "Found a room near AUB in two days. Utility badges saved me from a place with bad ishtirak.",
    name: "Maya K.",
    place: "Hamra",
  },
  {
    id: "2",
    quote:
      "As a landlord I listed once and got WhatsApp messages the same evening. Simple.",
    name: "Rami S.",
    place: "Achrafieh",
  },
  {
    id: "3",
    quote:
      "University hub mode is what I needed — sorted by distance to LAU Byblos.",
    name: "Nour H.",
    place: "Jounieh",
  },
] as const;

export const VALUE_PROPS = [
  {
    id: "whatsapp",
    title: "WhatsApp in one tap",
    body: "Open a pre-filled chat with the poster. Skoun is the bridge — deals stay between you.",
    icon: "logo-whatsapp" as const,
  },
  {
    id: "utilities",
    title: "Lebanese utility truth",
    body: "Solar, ishtirak, water, Wi‑Fi UPS, elevators — badges renters actually filter on.",
    icon: "flash-outline" as const,
  },
  {
    id: "campus",
    title: "University proximity",
    body: "Flip to campus mode and rank listings by distance to the gate you care about.",
    icon: "school-outline" as const,
  },
  {
    id: "report",
    title: "Report what is off",
    body: "Flag fake posts, wrong utilities, or already-rented places so the feed stays usable.",
    icon: "flag-outline" as const,
  },
] as const;

export const PROMO_CARDS = [
  {
    id: "list",
    title: "List your place",
    body: "Reach renters who message on WhatsApp. Credits unlock extra live listings.",
    cta: "Start listing",
    tone: "warm" as const,
    action: "list" as const,
  },
  {
    id: "roommates",
    title: "Find a roommate",
    body: "Match with seekers in your corridor — same-gender, verified phone.",
    cta: "Explore roommates",
    tone: "mist" as const,
    action: "roommates" as const,
  },
  {
    id: "browse",
    title: "Browse near campus",
    body: "Pick AUB, LAU, USJ and sort by distance to the gate.",
    cta: "Open university hub",
    tone: "deep" as const,
    action: "browse" as const,
  },
] as const;

export const STEPS = [
  {
    n: "1",
    title: "Discover",
    body: "Browse by neighborhood or university. Save the ones worth a second look.",
  },
  {
    n: "2",
    title: "Message",
    body: "Tap WhatsApp with a ready-made intro. Clarify rent, utilities, and viewing.",
  },
  {
    n: "3",
    title: "Move forward",
    body: "Agree offline. Skoun does not hold deposits or write leases.",
  },
] as const;

export const DIRECTORY_AREAS = [
  "Achrafieh",
  "Hamra",
  "Mar Mikhael",
  "Gemmayzeh",
  "Ras Beirut",
  "Verdun",
  "Jounieh",
  "Byblos",
  "Tripoli",
  "Saida",
  "Zahle",
  "Broummana",
  "Dbayeh",
  "Antelias",
] as const;

export const DIRECTORY_UNIS = [
  "AUB",
  "LAU Beirut",
  "LAU Byblos",
  "USJ",
  "LU",
  "NDU",
  "USEK",
  "BAU",
] as const;
