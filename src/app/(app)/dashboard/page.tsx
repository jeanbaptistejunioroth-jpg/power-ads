import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, Plus, RotateCcw } from "lucide-react";
import { OrderList } from "@/components/videos/order-list";
import { EmptyState } from "@/components/videos/empty-state";
import { CoinStack, DotGrid, PhoneVideo, Rings, Sparkle } from "@/components/decor";
import { requireUser } from "@/lib/profile";
import { getPricing, listOrders } from "@/lib/orders-server";
import { minVideoPrice, videoEquivalence } from "@/lib/order";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { getPricingContext } from "@/lib/geo";
import { formatPrice } from "@/lib/pricing";
import { TRIAL_PATH } from "@/lib/trial";
import { trialVideos } from "@/lib/video-phrase";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.nav.dashboard };
}

export default async function DashboardPage() {
  const { t, locale } = await getDictionary();
  const d = t.app.dashboard;
  const { supabase, profile } = await requireUser();
  const [pricing, orders] = await Promise.all([getPricing(supabase), listOrders(supabase, 5)]);
  const nf = new Intl.NumberFormat(locale);
  const firstName = profile.full_name?.split(" ")[0];
  // Pas encore de commande : solde trop bas → offre d'essai ; solde suffisant → première vidéo.
  const onboarding = orders.length ? null : profile.token_balance < minVideoPrice(pricing) ? "trial" : "first";
  const book = onboarding === "trial" ? (await getPricingContext()).book : null;
  const p = t.landing.pricing;

  return (
    <div>
      <h1 className="page-title">{firstName ? fmt(d.hello, { name: firstName }) : d.helloNoName}</h1>
      <p className="page-sub">{d.sub}</p>

      {onboarding && (
        <section className="card mt-8 flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
              <Plus size={19} aria-hidden />
            </span>
            {book ? (
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.01em]">
                  {fmt(d.trialTitle, { price: formatPrice(book.minAmount, book.currency, locale) })}
                </h2>
                <p className="mt-2 leading-relaxed text-ink-2">
                  {fmt(d.trialBody, { tokens: nf.format(book.minTokens), videos: trialVideos(book.minTokens, pricing, p, locale) })}
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink-3">
                  <RotateCcw size={15} className="mt-0.5 shrink-0" aria-hidden />
                  {p.trialRefund}
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.01em]">{d.firstTitle}</h2>
                <p className="mt-2 leading-relaxed text-ink-2">{d.firstBody}</p>
              </div>
            )}
          </div>
          <Link
            href={book ? TRIAL_PATH : "/videos/new"}
            className="btn btn-primary btn-md shrink-0 self-start sm:self-center"
          >
            {book ? p.trialCta : d.firstCta} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </section>
      )}

      <section className={`${onboarding ? "mt-5" : "mt-10"} grid gap-5 md:grid-cols-[1.2fr_1fr]`}>
        <div className="relative isolate overflow-hidden rounded-3xl bg-panel p-7 text-panel-ink sm:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <DotGrid tone="panel" className="inset-0" />
            <Rings className="anim-spin-slow absolute -end-28 -top-28 h-80 w-80 text-panel-accent opacity-40" />
            <CoinStack count={3} className="anim-float absolute bottom-6 end-6 h-20 w-20 text-panel-accent opacity-70" />
            <Sparkle className="absolute end-28 top-8 h-4 w-4 text-panel-accent" />
          </div>
          <p className="text-sm text-panel-ink-2">{d.balance}</p>
          <p className="mt-3 text-5xl font-semibold tabular-nums tracking-[-0.04em] sm:text-6xl">
            {nf.format(profile.token_balance)}
            <span className="ms-2 text-lg font-normal tracking-normal text-panel-ink-2">{t.common.tokens}</span>
          </p>
          <p className="mt-3 text-sm text-panel-ink-2">
            {fmt(d.balanceHint, { n: nf.format(videoEquivalence(profile.token_balance, pricing).n30) })}
          </p>
          <Link href="/billing" className="btn btn-md mt-8 bg-white text-[#0c2a6e] hover:bg-white/90">
            {d.buy} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>

        <div className="card relative isolate flex flex-col justify-between overflow-hidden p-7">
          <PhoneVideo className="anim-float-slow absolute -bottom-10 end-6 -z-10 hidden w-24 rotate-[8deg] opacity-90 sm:block" />
          <div className="sm:pe-28">
            <p className="text-lg font-semibold tracking-[-0.01em]">{d.newTitle}</p>
            <p className="mt-2 leading-relaxed text-ink-2">{d.newBody}</p>
          </div>
          <Link href="/videos/new" className="btn btn-primary btn-md mt-6 self-start">
            <Plus size={18} aria-hidden /> {d.newCta}
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-[-0.015em]">{d.recent}</h2>
          {orders.length > 0 && (
            <Link href="/videos" className="text-sm font-medium text-brand-text hover:underline hover:underline-offset-4">
              {d.seeAll}
            </Link>
          )}
        </div>
        <div className="mt-5">
          {orders.length ? (
            <OrderList orders={orders} t={t} locale={locale} />
          ) : (
            <EmptyState title={t.app.videos.emptyTitle} body={t.app.videos.emptyBody} cta={t.app.videos.emptyCta} />
          )}
        </div>
      </section>

      <Link href="/support" className="card mt-8 flex items-center gap-4 p-5 transition-colors hover:border-line-strong">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
          <LifeBuoy size={19} aria-hidden />
        </span>
        <span className="flex-1 font-medium">{d.support}</span>
        <span className="hidden text-sm font-medium text-brand-text sm:inline">{d.openSupport}</span>
      </Link>
    </div>
  );
}
