export const LOCALES = ["fr", "en", "es", "pt", "ar", "de", "it", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "pa_locale";

/** Nom de chaque langue dans sa propre langue (sélecteur de langue). */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  ar: "العربية",
  de: "Deutsch",
  it: "Italiano",
  zh: "中文",
};

/** Langues lues de droite à gauche. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────────────────────
// Langue selon le pays du visiteur (première visite seulement : ensuite le cookie fait foi).
// Pays à plusieurs langues : la langue du navigateur l'emporte si elle fait partie
// des langues du pays, sinon la 1re de la liste.
// Pays francophones (Cameroun, Belgique, Suisse, Tchad, Guinée équatoriale compris) et Québec :
// français d'office, le visiteur peut changer de langue.
// Pays absents de la liste : anglais.
// ─────────────────────────────────────────────────────────────
const MULTILINGUAL: Record<string, Locale[]> = {
  CA: ["en", "fr"], LU: ["fr", "de"],
  MA: ["ar", "fr"], DZ: ["ar", "fr"], TN: ["ar", "fr"], MR: ["ar", "fr"], DJ: ["fr", "ar"], KM: ["fr", "ar"],
  BI: ["fr", "en"], RW: ["en", "fr"], MU: ["en", "fr"], SC: ["en", "fr"], VU: ["en", "fr"],
  PR: ["es", "en"], US: ["en", "es"], HK: ["zh", "en"], SG: ["en", "zh"], MO: ["zh", "pt"],
};

const SINGLE: Record<Exclude<Locale, "en">, string> = {
  fr: "FR MC SN CI ML BF NE TG BJ GN CD CG GA CF MG CM TD GQ BE CH HT NC PF RE GP MQ GF YT PM BL MF WF",
  es: "ES MX AR CO PE VE CL EC GT CU BO DO HN PY SV NI CR PA UY",
  pt: "PT BR AO MZ CV GW ST TL",
  ar: "SA AE EG IQ JO KW LB LY OM QA SY YE BH SD PS SO EH",
  de: "DE AT LI",
  it: "IT SM VA",
  zh: "CN TW",
};

const COUNTRY_LOCALES: Record<string, Locale[]> = { ...MULTILINGUAL };
for (const [locale, codes] of Object.entries(SINGLE)) {
  for (const code of codes.split(" ")) COUNTRY_LOCALES[code] ??= [locale as Locale];
}

/** Code pays ISO à 2 lettres fourni par l'hébergeur (Vercel, Cloudflare) ou DEV_COUNTRY en local. */
export function countryFromHeaders(get: (name: string) => string | null): string | null {
  const raw = get("x-vercel-ip-country") ?? get("cf-ipcountry") ?? process.env.DEV_COUNTRY ?? null;
  const code = raw?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** Région ISO 3166-2 (« QC ») fournie par Vercel ou Cloudflare, ou DEV_REGION en local. */
export function regionFromHeaders(get: (name: string) => string | null): string | null {
  const raw = get("x-vercel-ip-country-region") ?? get("cf-region-code") ?? process.env.DEV_REGION ?? null;
  const code = raw?.trim().toUpperCase();
  return code && /^[A-Z0-9]{1,3}$/.test(code) ? code : null;
}

/** Langues gérées, dans l'ordre de préférence du navigateur ("fr-CM,fr;q=0.9,en;q=0.8"). */
function browserLocales(acceptLanguage: string | null): Locale[] {
  if (!acceptLanguage) return [];
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map((x) => x.base)
    .filter(isLocale);
}

/** Langue de l'interface : d'après le pays (et la région), puis le navigateur, puis l'anglais. */
export function detectLocale(acceptLanguage: string | null, country?: string | null, region?: string | null): Locale {
  const browser = browserLocales(acceptLanguage);
  if (country === "CA" && region === "QC") return "fr";
  if (country) {
    const spoken = COUNTRY_LOCALES[country] ?? ["en"];
    return browser.find((l) => spoken.includes(l)) ?? spoken[0];
  }
  return browser[0] ?? DEFAULT_LOCALE;
}
