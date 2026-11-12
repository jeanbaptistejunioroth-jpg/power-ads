"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, Check, Coins, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import {
  ALL_CURRENCIES,
  CURRENCY_COOKIE,
  PACKS,
  currencyLabel,
  formatPrice,
  tokensForAmount,
  type PriceBook,
} from "@/lib/pricing";
import { CoinStack, GlowOrb } from "@/components/decor";
import { videoEquivalence, type TokenGrid } from "@/lib/order";
import { TRIAL_PATH } from "@/lib/trial";
import { trialVideos, videoPhrase } from "@/lib/video-phrase";

export function setCurrencyCookie(value: string) {
  document.cookie =
    value === "auto"
      ? `${CURRENCY_COOKIE}=; path=/; max-age=0`
      : `${CURRENCY_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function CurrencyOptions() {
  const { locale } = useI18n();
  const options = useMemo(() => ALL_CURRENCIES.map((c) => ({ c, label: currencyLabel(c, locale) })), [locale]);
  // Les noms de monnaies viennent des données de langue du serveur puis du navigateur, qui peuvent
  // différer d'une version à l'autre : sans conséquence, on n'en fait pas une erreur d'hydratation.
  return options.map(({ c, label }) => (
    <option key={c} value={c} suppressHydrationWarning>
      {label}
    </option>
  ));
}

export function PricingGrid({
  book,
  grid,
  country,
  signedIn,
  trial = false,
  prefillMin = false,
}: {
  book: PriceBook;
  /** Grille réelle (getPricing) : sert aux équivalences en vidéos. */
  grid: TokenGrid;
  country: string | null;
  signedIn: boolean;
  /** Affiche la carte « Essai » (achat minimum) avant les packs. */
  trial?: boolean;
  /** Arrivée depuis l'offre d'essai : montant libre au minimum, mis en vue. */
  prefillMin?: boolean;
}) {
  const { t, locale } = useI18n();
  const p = t.landing.pricing;
  const router = useRouter();
  const [pending, start] = useTransition();
  const nf = new Intl.NumberFormat(locale);
  const price = (n: number) => formatPrice(n, book.currency, locale);
  const videos = videoPhrase(p, locale);

  let countryName: string | null = null;
  try {
    countryName = country ? new Intl.DisplayNames([locale], { type: "region" }).of(country) ?? country : null;
  } catch {
    countryName = country;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">{countryName ? fmt(p.detected, { country: countryName }) : ""}</p>
        <label className="inline-flex items-center gap-2 text-sm text-ink-2">
          {p.currency}
          <select
            value={book.currency}
            disabled={pending}
            onChange={(e) => {
              setCurrencyCookie(e.target.value);
              start(() => router.refresh());
            }}
            className="h-10 max-w-[15rem] cursor-pointer rounded-full border border-line bg-elev px-4 text-sm font-medium text-ink"
          >
            <CurrencyOptions />
          </select>
        </label>
      </div>

      {trial && (
        <div
          className={`mb-5 flex flex-col gap-5 rounded-3xl border border-line bg-elev p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 ${pending ? "opacity-60" : ""}`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-lg font-semibold">{p.trialName}</h3>
              <p className="text-2xl font-medium tracking-[-0.02em] tabular-nums">{price(book.minAmount)}</p>
              <p className="text-sm font-medium tabular-nums text-ink-2">
                {nf.format(book.minTokens)} {t.common.tokens}
              </p>
            </div>
            <p className="mt-1.5 text-sm text-ink-3">= {trialVideos(book.minTokens, grid, p, locale)}</p>
            <p className="mt-3 flex items-start gap-2 text-sm text-ink-2">
              <RotateCcw size={15} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
              {p.trialRefund}
            </p>
          </div>
          <Link href={signedIn ? TRIAL_PATH : "/signup?trial=1"} className="btn btn-ghost btn-md shrink-0">
            {p.trialCta} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      )}

      <div className={`grid gap-5 md:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
        {PACKS.map((pack, i) => {
          const href = signedIn ? `/api/checkout?pack=${pack.id}&currency=${book.currency}` : `/signup`;
          return (
            <div
              key={pack.id}
              className={`group relative isolate flex flex-col rounded-3xl border p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(12,42,110,0.35)] ${
                pack.featured ? "border-brand bg-elev ring-1 ring-brand" : "border-line bg-elev"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl" aria-hidden>
                {pack.featured && <GlowOrb className="-top-24 end-[-4rem] h-56 w-56 opacity-70" />}
                <CoinStack count={i + 1} className="absolute end-6 top-6 h-12 w-12 text-brand-text opacity-80" />
              </div>
              {pack.featured && (
                <span className="absolute -top-3 start-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">
                  {p.popular}
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.packs[pack.id]}</h3>
              <p className="mt-5 text-4xl font-medium tracking-[-0.03em] tabular-nums">{price(book.packs[pack.id])}</p>
              <p className="mt-2 flex items-center gap-2 text-ink-2">
                <span className="font-medium text-ink tabular-nums">
                  {nf.format(pack.tokens)} {t.common.tokens}
                </span>
                {pack.bonus > 0 && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-text">
                    {fmt(p.bonus, { n: pack.bonus })}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-sm text-ink-3">
                {(() => {
                  const eq = videoEquivalence(pack.tokens, grid);
                  return fmt(p.equivPack, { a: videos(eq.n30, 30), b: videos(eq.n15, 15) });
                })()}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-text" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                prefetch={false}
                className={`btn btn-md mt-8 w-full ${pack.featured ? "btn-primary" : "btn-ghost"}`}
              >
                {p.buy}
              </Link>
            </div>
          );
        })}
      </div>

      {/* key : un changement de devise repart d'un montant valable dans la nouvelle devise. */}
      <CustomAmount key={book.currency} book={book} grid={grid} signedIn={signedIn} pending={pending} prefillMin={prefillMin} />

      {book.source === "live" && book.rateSource && (
        <p className="mt-4 text-xs text-ink-3">
          {p.ratesPrefix}{" "}
          <a href={book.rateSource.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink-2">
            {book.rateSource.name}
          </a>
        </p>
      )}
    </div>
  );
}

/** Achat libre : le client choisit la somme, le nombre de tokens se calcule en direct. */
function CustomAmount({
  book,
  grid,
  signedIn,
  pending,
  prefillMin,
}: {
  book: PriceBook;
  grid: TokenGrid;
  signedIn: boolean;
  pending: boolean;
  prefillMin: boolean;
}) {
  const { t, locale } = useI18n();
  const p = t.landing.pricing;
  const nf = new Intl.NumberFormat(locale);
  const price = (n: number) => formatPrice(n, book.currency, locale);
  const [raw, setRaw] = useState(String(prefillMin ? book.minAmount : (book.suggestions[0] ?? book.minAmount)));
  const amount = Number(raw.replace(",", "."));
  const valid = Number.isFinite(amount) && amount >= book.minAmount && amount <= book.maxAmount;
  // Tarif de base, sans bonus : un pack rapporte toujours plus pour le même montant.
  const total = valid ? tokensForAmount(amount, book) : 0;
  const videos = videoPhrase(p, locale);
  const best = videoEquivalence(total, grid).best;

  // Offre d'essai : le montant pré-rempli est sous les packs, on l'amène à l'écran.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefillMin) box.current?.scrollIntoView({ block: "center" });
  }, [prefillMin]);

  return (
    <div ref={box} className={`relative mt-5 overflow-hidden rounded-3xl border border-line bg-elev ${pending ? "opacity-60" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,var(--brand-soft),transparent_55%)] opacity-80" aria-hidden />
      <div className="relative grid gap-6 p-7 md:grid-cols-[1.25fr_1fr] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
              <Coins size={20} aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">{p.customTitle}</h3>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">
            {fmt(p.customSub, { min: price(book.minAmount), tokens: nf.format(book.minTokens) })}
          </p>
          <label htmlFor="custom-amount" className="label mt-5">
            {p.customLabel} ({book.currency === "XAF" || book.currency === "XOF" ? "FCFA" : book.currency})
          </label>
          <input
            id="custom-amount"
            type="number"
            inputMode="decimal"
            min={book.minAmount}
            max={book.maxAmount}
            step={book.decimals ? "0.01" : "1"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="field max-w-xs text-lg font-medium tabular-nums"
            aria-describedby="custom-amount-hint"
          />
          <p id="custom-amount-hint" className={`hint ${!valid && raw !== "" ? "text-danger" : ""}`}>
            {fmt(p.customRange, { min: price(book.minAmount), max: price(book.maxAmount) })}
          </p>
          {book.suggestions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.suggestions.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={amount === s} onClick={() => setRaw(String(s))}>
                  {price(s)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-sunken p-6">
          <p className="text-sm text-ink-2">{p.customGet}</p>
          <p className="mt-2 text-4xl font-medium tracking-[-0.03em] tabular-nums">
            {nf.format(valid ? total : 0)} <span className="text-base font-normal text-ink-2">{t.common.tokens}</span>
          </p>
          {valid && best.n > 0 && (
            <p className="mt-2 text-sm text-ink-2">
              {best.rest > 0
                ? fmt(p.equivCustom, { videos: videos(best.n, best.d), rest: nf.format(best.rest) })
                : fmt(p.equivCustomExact, { videos: videos(best.n, best.d) })}
            </p>
          )}
          {valid && amount === book.minAmount && <p className="mt-1.5 text-sm font-medium text-brand-text">{p.perfectTrial}</p>}
          {valid && signedIn ? (
            <Link
              href={`/api/checkout?amount=${amount}&currency=${book.currency}`}
              prefetch={false}
              className="btn btn-primary btn-md mt-6 w-full"
            >
              {fmt(p.customBuy, { n: nf.format(total) })} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          ) : valid ? (
            <Link href="/signup" className="btn btn-primary btn-md mt-6 w-full">
              {fmt(p.customBuy, { n: nf.format(total) })} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          ) : (
            <button type="button" disabled className="btn btn-primary btn-md mt-6 w-full">
              {fmt(p.customBuy, { n: nf.format(0) })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
