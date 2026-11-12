import "server-only";
import { cookies, headers } from "next/headers";
import { countryFromHeaders, detectLocale, isLocale, LOCALE_COOKIE, regionFromHeaders, RTL_LOCALES, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/fr";
import { fr } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { pt } from "./dictionaries/pt";
import { ar } from "./dictionaries/ar";
import { de } from "./dictionaries/de";
import { it } from "./dictionaries/it";
import { zh } from "./dictionaries/zh";

const dictionaries: Record<Locale, Dictionary> = { fr, en, es, pt, ar, de, it, zh };

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  const get = (name: string) => h.get(name);
  return detectLocale(h.get("accept-language"), countryFromHeaders(get), regionFromHeaders(get));
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale], dir: RTL_LOCALES.includes(locale) ? ("rtl" as const) : ("ltr" as const) };
}

export function dictionaryFor(locale: Locale) {
  return dictionaries[locale];
}
