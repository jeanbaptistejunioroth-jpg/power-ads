// ─────────────────────────────────────────────────────────────
// Packs de tokens, achat libre et prix affichés par devise.
// • 6 monnaies ont des prix FIXÉS À LA MAIN (FIXED_PRICES) : un prix rond convertit mieux.
// • Toutes les autres sont converties depuis le dollar au taux du jour (src/lib/fx.ts),
//   puis arrondies proprement.
// Ajuste librement les montants ci-dessous.
// ─────────────────────────────────────────────────────────────

export const CURRENCY_COOKIE = "pa_currency";
export const BASE_CURRENCY = "USD";

export type PackId = "starter" | "growth" | "scale";

/**
 * Packs : tokens reçus (bonus compris) pour le prix de FIXED_PRICES. Base : 1 token = 0,10 $ = 62,5 FCFA.
 * Starter 1 000 + 5 %, Growth 2 000 + 10 %, Scale 5 000 + 15 % : un pack rapporte toujours plus
 * que le même montant en achat libre (tarif de base, sans bonus).
 */
export const PACKS: { id: PackId; tokens: number; bonus: number; featured?: boolean }[] = [
  { id: "starter", tokens: 1050, bonus: 5 },
  { id: "growth", tokens: 2200, bonus: 10, featured: true },
  { id: "scale", tokens: 5750, bonus: 15 },
];

export const FIXED_PRICES: Record<string, Record<PackId, number>> = {
  USD: { starter: 100, growth: 200, scale: 500 },
  EUR: { starter: 95, growth: 190, scale: 475 },
  XAF: { starter: 62500, growth: 125000, scale: 312500 },
  XOF: { starter: 62500, growth: 125000, scale: 312500 },
  GBP: { starter: 80, growth: 160, scale: 400 },
  CAD: { starter: 135, growth: 270, scale: 675 },
};

/** Achat libre : minimum et maximum de tokens par paiement. */
export const MIN_CUSTOM_TOKENS = 100;
export const MAX_CUSTOM_TOKENS = 100_000;
/** Montants proposés d'un clic pour l'achat libre, en tokens (convertis dans la devise affichée). */
const SUGGESTED_TOKENS = [100, 200, 400];

// Monnaie officielle de chaque pays (ISO 3166 → ISO 4217). Pays absents : dollar.
// Pays à monnaie instable ou sous sanctions : dollar, plus réaliste pour payer.
const COUNTRY_CURRENCY_TABLE =
  "AD:EUR AE:AED AF:AFN AG:XCD AI:XCD AL:ALL AM:AMD AO:AOA AR:ARS AT:EUR AU:AUD AW:AWG AX:EUR AZ:AZN " +
  "BA:BAM BB:BBD BD:BDT BE:EUR BF:XOF BG:EUR BH:BHD BI:BIF BJ:XOF BL:EUR BM:BMD BN:BND BO:BOB BR:BRL " +
  "BS:BSD BT:BTN BW:BWP BY:BYN BZ:BZD CA:CAD CC:AUD CD:CDF CF:XAF CG:XAF CH:CHF CI:XOF CK:NZD CL:CLP " +
  "CM:XAF CN:CNY CO:COP CR:CRC CV:CVE CX:AUD CY:EUR CZ:CZK DE:EUR DJ:DJF DK:DKK DM:XCD DO:DOP DZ:DZD " +
  "EE:EUR EG:EGP EH:MAD ER:ERN ES:EUR ET:ETB FI:EUR FJ:FJD FK:FKP FO:DKK FR:EUR GA:XAF GB:GBP GD:XCD " +
  "GE:GEL GF:EUR GG:GBP GH:GHS GI:GIP GL:DKK GM:GMD GN:GNF GP:EUR GQ:XAF GR:EUR GT:GTQ GW:XOF GY:GYD " +
  "HK:HKD HN:HNL HR:EUR HT:HTG HU:HUF ID:IDR IE:EUR IL:ILS IM:GBP IN:INR IQ:IQD IS:ISK IT:EUR JE:GBP " +
  "JM:JMD JO:JOD JP:JPY KE:KES KG:KGS KH:KHR KI:AUD KM:KMF KN:XCD KR:KRW KW:KWD KY:KYD KZ:KZT LA:LAK " +
  "LC:XCD LI:CHF LK:LKR LR:LRD LS:LSL LT:EUR LU:EUR LV:EUR LY:LYD MA:MAD MC:EUR MD:MDL ME:EUR MF:EUR " +
  "MG:MGA MK:MKD ML:XOF MM:MMK MN:MNT MO:MOP MQ:EUR MR:MRU MS:XCD MT:EUR MU:MUR MV:MVR MW:MWK MX:MXN " +
  "MY:MYR MZ:MZN NA:NAD NC:XPF NE:XOF NF:AUD NG:NGN NI:NIO NL:EUR NO:NOK NP:NPR NR:AUD NU:NZD NZ:NZD " +
  "OM:OMR PE:PEN PF:XPF PG:PGK PH:PHP PK:PKR PL:PLN PM:EUR PN:NZD PS:ILS PT:EUR PY:PYG QA:QAR RE:EUR " +
  "RO:RON RS:RSD RU:RUB RW:RWF SA:SAR SB:SBD SC:SCR SD:SDG SE:SEK SG:SGD SH:SHP SI:EUR SK:EUR SL:SLE " +
  "SM:EUR SN:XOF SO:SOS SR:SRD ST:STN SZ:SZL TD:XAF TG:XOF TH:THB TJ:TJS TK:NZD TM:TMT TN:TND TO:TOP " +
  "TR:TRY TT:TTD TV:AUD TW:TWD TZ:TZS UA:UAH UG:UGX UY:UYU UZ:UZS VA:EUR VC:XCD VN:VND VU:VUV WF:XPF " +
  "WS:WST XK:EUR YE:YER YT:EUR ZA:ZAR ZM:ZMW";

const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(
  COUNTRY_CURRENCY_TABLE.split(" ").map((pair) => pair.split(":") as [string, string]),
);

/** Toutes les monnaies proposées dans les sélecteurs. */
export const ALL_CURRENCIES: string[] = [...new Set([...Object.keys(FIXED_PRICES), ...Object.values(COUNTRY_CURRENCY)])].sort();

export function currencyForCountry(country: string | null | undefined): string {
  return COUNTRY_CURRENCY[(country ?? "").toUpperCase()] ?? BASE_CURRENCY;
}

export function isCurrencyCode(v: unknown): v is string {
  return typeof v === "string" && /^[A-Z]{3}$/.test(v);
}

/** Tout ce qu'il faut pour afficher et encaisser un prix dans une devise (calculé côté serveur). */
export type PriceBook = {
  currency: string;
  packs: Record<PackId, number>;
  /** Prix d'un token, sans bonus (achat libre). */
  unit: number;
  decimals: 0 | 2;
  /** Achat libre : minimum de tokens (MIN_CUSTOM_TOKENS) et son prix dans la devise. */
  minTokens: number;
  minAmount: number;
  maxAmount: number;
  suggestions: number[];
  source: "fixed" | "live";
  rateSource?: { name: string; url: string };
};

/** Arrondi « propre » : 2 chiffres significatifs (3 au-delà de 1 000). 153 712 → 154 000, 87,4 → 87. */
export function niceRound(x: number, digits = x >= 1000 ? 3 : 2) {
  if (!(x > 0)) return 0;
  const step = 10 ** (Math.floor(Math.log10(x)) - digits + 1);
  return Math.max(step, Math.round(x / step) * step);
}

const roundTo = (x: number, decimals: number) => Math.round(x * 10 ** decimals) / 10 ** decimals;
const ceilTo = (x: number, decimals: number) => Math.ceil(x * 10 ** decimals - 1e-9) / 10 ** decimals;

/** Comme niceRound, mais toujours vers le haut : le montant obtenu achète au moins le nombre de tokens visé. */
function ceilNice(x: number) {
  if (!(x > 0)) return 0;
  const step = 10 ** (Math.floor(Math.log10(x)) - (x >= 1000 ? 3 : 2) + 1);
  return roundTo(Math.ceil(x / step - 1e-9) * step, 2);
}

/**
 * Construit le barème d'une devise. `usdRate` = combien d'unités de la devise pour 1 dollar ;
 * absent pour les monnaies à prix fixés à la main.
 */
export function buildPriceBook(currency: string, usdRate?: number, rateSource?: PriceBook["rateSource"]): PriceBook {
  const usd = FIXED_PRICES.USD;
  const fixed = FIXED_PRICES[currency];
  // Prix d'un token au tarif de base : 0,10 $ (pack Starter sans son bonus), même rapport dans chaque devise.
  const BASE_TOKENS_PER_100_USD = 1000;
  const rate = fixed ? fixed.starter / usd.starter : (usdRate ?? 1);
  const decimals: 0 | 2 = rate < 10 ? 2 : 0;
  // 3 chiffres significatifs : l'arrondi (≤ 0,5 %) ne peut pas effacer le bonus du pack.
  const packs = fixed ?? {
    starter: niceRound(usd.starter * rate, 3),
    growth: niceRound(usd.growth * rate, 3),
    scale: niceRound(usd.scale * rate, 3),
  };
  const unit = (fixed ? fixed.starter : usd.starter * rate) / BASE_TOKENS_PER_100_USD;
  const minAmount = ceilTo(MIN_CUSTOM_TOKENS * unit, decimals);
  return {
    currency,
    packs,
    unit,
    decimals,
    minTokens: MIN_CUSTOM_TOKENS,
    minAmount,
    maxAmount: roundTo(MAX_CUSTOM_TOKENS * unit, decimals),
    suggestions: [...new Set(SUGGESTED_TOKENS.map((t) => (fixed ? roundTo(t * unit, decimals) : ceilNice(t * unit))))].filter(
      (a) => a >= minAmount,
    ),
    source: fixed ? "fixed" : "live",
    ...(fixed ? {} : { rateSource }),
  };
}

/** Tokens obtenus pour un montant libre : tarif de base, sans bonus (même calcul navigateur et serveur). */
export function tokensForAmount(amount: number, book: Pick<PriceBook, "unit">) {
  return Math.floor(amount / book.unit + 1e-9);
}

export function formatPrice(amount: number, currency: string, locale: string) {
  // FCFA (XAF/XOF) : sans décimales, espace pour les milliers, quelle que soit la langue (6 250 FCFA).
  if (currency === "XAF" || currency === "XOF") {
    const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount));
    // Espace insécable classique (U+00A0) : le montant et « FCFA » ne sont jamais coupés en fin de ligne.
    return `${n.replace(/\s/g, "\u00a0")}\u00a0FCFA`;
  }
  const fraction = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
  }
}

/** Nom lisible d'une devise dans la langue de l'interface (« Naira nigérian »). */
export function currencyLabel(code: string, locale: string) {
  if (code === "XAF" || code === "XOF") return `FCFA (${code})`;
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch {
    return code;
  }
}
