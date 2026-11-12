import type {
  AGE_RANGES,
  APPEARANCES,
  AspectRatio,
  VideoStyle,
  Duration,
  GENDERS,
  REGIONS,
  TONES,
} from "@/lib/order";

export type Draft = {
  step: number;
  maxStep: number;
  productTab: "shopify" | "manual";
  shopifyUrl: string;
  product: {
    source: "shopify" | "manual";
    name: string;
    url: string;
    description: string;
    price: string;
    images: string[];
  };
  audience: {
    regions: (typeof REGIONS)[number][];
    gender: (typeof GENDERS)[number];
    ages: (typeof AGE_RANGES)[number][];
    appearances: (typeof APPEARANCES)[number][];
    tone: (typeof TONES)[number];
  };
  language: "fr" | "en";
  style: string;
  count: number;
  duration: Duration;
  ratio: AspectRatio;
  videoStyle: VideoStyle;
  scriptMode: "ai" | "client";
  scripts: string[];
  simulated: boolean;
  confirmed: boolean;
  whatsapp: string;
};

export function emptyDraft(locale: string, whatsapp: string): Draft {
  return {
    step: 0,
    maxStep: 0,
    productTab: "shopify",
    shopifyUrl: "",
    product: { source: "manual", name: "", url: "", description: "", price: "", images: [] },
    audience: { regions: [], gender: "mixed", ages: [], appearances: [], tone: "dynamic" },
    // Voix des vidéos : français ou anglais uniquement, quelle que soit la langue de l'interface.
    language: locale === "fr" ? "fr" : "en",
    style: "",
    count: 1,
    duration: 30,
    ratio: "9:16",
    videoStyle: "mixed",
    scriptMode: "ai",
    scripts: [],
    simulated: false,
    confirmed: false,
    whatsapp,
  };
}

export type SetDraft = (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
