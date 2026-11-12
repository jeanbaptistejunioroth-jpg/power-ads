import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PricingGrid } from "@/components/pricing/pricing-grid";
import { GoogleDriveIcon, ShopifyIcon, WhatsAppIcon } from "@/components/brand-icons";
import {
  DotGrid,
  FilmStrip,
  GlowOrb,
  PhoneVideo,
  PlayButton,
  Rings,
  Sparkle,
  StepArt,
  VideoThumb,
  Waveform,
} from "@/components/decor";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { getPricingContext } from "@/lib/geo";
import { getPricing } from "@/lib/orders-server";
import { minVideoPrice } from "@/lib/order";
import { formatPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const { t, locale } = await getDictionary();
  const L = t.landing;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    pricing,
  ] = await Promise.all([supabase.auth.getUser(), getPricing(supabase)]);
  const { country, book } = await getPricingContext();
  // « À partir de X tokens » : le prix le plus bas de la grille réelle (durée × style).
  const prices = { min: minVideoPrice(pricing) };

  const integrations = [
    { key: "shopify", Icon: ShopifyIcon, ...L.integrations.shopify },
    { key: "drive", Icon: GoogleDriveIcon, ...L.integrations.drive },
    { key: "whatsapp", Icon: WhatsAppIcon, ...L.integrations.whatsapp },
  ];

  return (
    <>
      <SiteHeader signedIn={!!user} />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative isolate overflow-x-clip">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <GlowOrb className="-top-32 start-[-8rem] h-[26rem] w-[26rem]" />
            <GlowOrb tone="accent" className="top-24 end-[-6rem] h-[22rem] w-[22rem]" />
            <DotGrid className="inset-x-0 top-0 h-[34rem] opacity-60" />
          </div>
          <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:pb-28">
            <div>
              <h1 className="display text-[clamp(2.5rem,5vw,4rem)]">
                {L.titleA} <em className="text-ink-2">{L.titleEm}</em> {L.titleB}
              </h1>
              <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-ink-2">{L.sub}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={user ? "/videos/new" : "/signup?trial=1"} className="btn btn-primary btn-lg">
                  {user ? t.app.nav.newVideo : L.cta} <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
                </Link>
                <Link href="#pricing" className="btn btn-ghost btn-lg">
                  {L.secondary}
                </Link>
              </div>
              {!user && (
                <p className="mt-5 flex max-w-[34rem] items-start gap-2 text-sm leading-relaxed text-ink-2">
                  <Wallet size={16} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                  <span>{fmt(L.trialLine, { min: formatPrice(book.minAmount, book.currency, locale) })}</span>
                </p>
              )}
              <div className="mt-10 flex items-center gap-4 text-brand-text" aria-hidden>
                <PlayButton className="h-11 w-11" />
                <Waveform className="h-8 opacity-80" bars={16} />
                <Sparkle className="h-4 w-4" />
              </div>
            </div>

            <div className="relative">
              <PhoneVideo slot={4} className="anim-float-slow absolute -top-14 end-[-1.5rem] hidden w-[8.5rem] rotate-[8deg] sm:block lg:end-[-3rem] lg:w-[9.5rem]" />
              <Sparkle className="absolute -top-6 start-6 h-5 w-5 text-brand-text" />
              <div
                className="anim-float pointer-events-none absolute -bottom-6 start-[-1rem] z-10 hidden items-center gap-2.5 rounded-2xl border border-line bg-elev px-3.5 py-2.5 text-brand-text shadow-[0_18px_40px_-24px_rgba(12,42,110,0.45)] sm:inline-flex"
                aria-hidden
              >
                <PlayButton className="h-7 w-7" pulse={false} />
                <Waveform className="h-5" bars={10} />
              </div>
              <OrderPreview t={t} />
            </div>
          </section>
        </div>

        {/* ── Fonctionnement ───────────────────────────────────── */}
        <section id="how" className="relative isolate scroll-mt-20 overflow-hidden border-y border-line bg-elev">
          <FilmStrip className="pointer-events-none absolute -top-3 end-[-6rem] -z-10 hidden w-[34rem] rotate-[-4deg] text-brand-text opacity-25 md:block" />
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{L.how.title}</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {L.how.steps.map((step, i) => (
                <li key={step.title}>
                  <StepArt step={i as 0 | 1 | 2} />
                  <div className="mt-6 border-t border-line-strong pt-6">
                    <span className="text-sm font-semibold tabular-nums text-brand-text">0{i + 1}</span>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.015em]">{step.title}</h3>
                    <p className="mt-3 leading-relaxed text-ink-2">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Intégrations ─────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
          <h2 className="text-sm font-medium text-ink-3">{L.integrations.title}</h2>
          <ul className="relative mt-6 grid gap-4 md:grid-cols-3">
            <span aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 hidden border-t-2 border-dashed border-line-strong md:block" />
            {integrations.map(({ key, Icon, name, body }) => (
              <li
                key={key}
                className="card relative flex gap-4 p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(12,42,110,0.4)]"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        <section id="pricing" className="relative isolate scroll-mt-20 mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <DotGrid className="inset-x-0 top-10 -z-10 h-72 opacity-50" />
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{L.pricing.title}</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{fmt(L.pricing.sub, prices)}</p>
          <div className="mt-10">
            <PricingGrid book={book} grid={pricing} country={country} signedIn={!!user} trial />
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <section id="faq" className="relative scroll-mt-20 mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="pointer-events-none absolute end-8 top-16 hidden w-60 lg:block xl:end-0" aria-hidden>
            <div className="relative">
              <GlowOrb className="inset-0 h-full w-full" />
              <PhoneVideo slot={2} className="anim-float relative mx-auto w-40 -rotate-3" />
              <div className="anim-float-delay absolute -start-6 top-16 rounded-2xl rounded-es-md bg-brand px-3.5 py-2.5 text-on-brand shadow-lg">
                <Waveform className="h-4" bars={8} />
              </div>
              <div className="anim-float-slow absolute -end-4 bottom-20 rounded-2xl rounded-ee-md border border-line bg-elev px-3 py-2 shadow-lg">
                <span className="block h-1.5 w-12 rounded-full bg-line-strong" />
                <span className="mt-1.5 block h-1.5 w-8 rounded-full bg-line" />
              </div>
              <Sparkle className="absolute -top-3 end-6 h-4 w-4 text-brand-text" />
            </div>
          </div>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{L.faq.title}</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {L.faq.items.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown size={20} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{fmt(item.a, prices)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Appel final ─────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden bg-panel text-panel-ink">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <DotGrid tone="panel" className="inset-0" />
            <Rings className="anim-spin-slow absolute -end-24 -top-28 h-96 w-96 text-panel-accent opacity-40" />
            <FilmStrip className="absolute -bottom-6 start-[-2rem] w-[30rem] rotate-[-3deg] text-panel-accent opacity-30" />
            <span className="anim-float absolute end-[22%] top-6 hidden opacity-80 md:block">
              <PlayButton tone="white" className="h-9 w-9" />
            </span>
            <Sparkle className="absolute start-[46%] top-8 h-4 w-4 text-panel-accent" />
          </div>
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center">
            <div>
              <h2 className="display text-4xl sm:text-5xl">{L.finalCta.title}</h2>
              <p className="mt-4 text-lg text-panel-ink-2">{L.finalCta.sub}</p>
            </div>
            <Link
              href={user ? "/videos/new" : "/signup"}
              className="btn btn-lg bg-white text-[#0c2a6e] hover:bg-white/90"
            >
              {user ? t.app.nav.newVideo : L.finalCta.cta} <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Aperçu d'une commande : montre concrètement ce que le client obtient. */
function OrderPreview({ t }: { t: Awaited<ReturnType<typeof getDictionary>>["t"] }) {
  const d = t.landing.demo;
  const rows = [
    [d.product, d.productValue],
    [d.audience, d.audienceValue],
    [d.format, d.formatValue],
  ];
  return (
    <div className="card relative p-6 shadow-[0_24px_60px_-36px_rgba(12,42,110,0.35)] sm:p-8" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{d.title}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {d.status}
        </span>
      </div>
      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
            <dt className="shrink-0 text-ink-3">{k}</dt>
            <dd className="min-w-0 truncate font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid grid-cols-4 gap-2.5">
        {([0, 1, 2, 3] as const).map((h) => (
          <VideoThumb key={h} hue={h} slot={h} label="0:30" />
        ))}
      </div>
      <ol className="mt-6 space-y-3">
        {d.steps.map((s) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-on-brand">
              <Check size={12} strokeWidth={3} />
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-sunken px-4 py-3.5 text-sm font-medium">
        <GoogleDriveIcon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{d.delivered}</span>
      </div>
    </div>
  );
}
