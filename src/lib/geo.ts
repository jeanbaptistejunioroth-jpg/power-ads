import "server-only";
import { cookies, headers } from "next/headers";
import { countryFromHeaders } from "./i18n/config";
import { CURRENCY_COOKIE, currencyForCountry, isCurrencyCode } from "./pricing";
import { getPriceBook } from "./fx";

/**
 * Pays du visiteur, fourni par l'hébergeur :
 *  - Vercel      → x-vercel-ip-country
 *  - Cloudflare  → cf-ipcountry
 * En local, aucun en-tête : on retombe sur DEV_COUNTRY (ex. "CM") ou null.
 */
export async function getCountry(): Promise<string | null> {
  const h = await headers();
  return countryFromHeaders((name) => h.get(name));
}

/** Devise choisie manuellement (cookie) sinon devise du pays détecté. */
export async function getCurrency(): Promise<{ currency: string; country: string | null; manual: string | null }> {
  const country = await getCountry();
  const raw = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const manual = isCurrencyCode(raw) ? raw : null;
  return { currency: manual ?? currencyForCountry(country), country, manual };
}

/** Pays + barème des prix (packs et achat libre) dans la devise du visiteur. */
export async function getPricingContext() {
  const { currency, country } = await getCurrency();
  return { country, book: await getPriceBook(currency) };
}
