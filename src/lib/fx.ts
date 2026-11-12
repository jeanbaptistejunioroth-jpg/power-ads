import "server-only";
import { buildPriceBook, FIXED_PRICES, BASE_CURRENCY, type PriceBook } from "./pricing";

// ─────────────────────────────────────────────────────────────
// Taux de change du jour (1 dollar = X unités), pour les monnaies sans prix fixés à la main.
// Deux sources gratuites et sans clé ; résultat gardé 12 h. Si aucune ne répond,
// les prix s'affichent en dollars (toujours justes) plutôt qu'avec un taux périmé.
// ─────────────────────────────────────────────────────────────

type Rates = { rates: Record<string, number>; source: { name: string; url: string } };

const SOURCES: { name: string; url: string; link: string; pick: (json: unknown) => Record<string, number> | null }[] = [
  {
    name: "ExchangeRate-API",
    url: "https://open.er-api.com/v6/latest/USD",
    link: "https://www.exchangerate-api.com",
    pick: (j) => {
      const d = j as { result?: string; rates?: Record<string, number> };
      return d.result === "success" && d.rates ? d.rates : null;
    },
  },
  {
    name: "Currency API",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    link: "https://github.com/fawazahmed0/exchange-api",
    pick: (j) => {
      const d = j as { usd?: Record<string, number> };
      return d.usd ? Object.fromEntries(Object.entries(d.usd).map(([k, v]) => [k.toUpperCase(), v])) : null;
    },
  },
];

const MEMORY_MS = 6 * 3600 * 1000;
let memo: { at: number; value: Rates } | null = null;

export async function getUsdRates(): Promise<Rates | null> {
  if (memo && Date.now() - memo.at < MEMORY_MS) return memo.value;
  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, { next: { revalidate: 43_200 }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const rates = source.pick(await res.json());
      if (rates && rates.EUR > 0) {
        memo = { at: Date.now(), value: { rates, source: { name: source.name, url: source.link } } };
        return memo.value;
      }
    } catch {
      /* source suivante */
    }
  }
  return memo?.value ?? null;
}

/** Barème dans la devise demandée ; en dollars si la devise est inconnue ou le taux indisponible. */
export async function getPriceBook(currency: string): Promise<PriceBook> {
  if (FIXED_PRICES[currency]) return buildPriceBook(currency);
  const fx = await getUsdRates();
  const rate = fx?.rates[currency];
  if (!fx || !rate || !(rate > 0) || !Number.isFinite(rate)) return buildPriceBook(BASE_CURRENCY);
  return buildPriceBook(currency, rate, fx.source);
}
