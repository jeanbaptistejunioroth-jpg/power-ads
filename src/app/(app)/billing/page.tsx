import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PricingGrid } from "@/components/pricing/pricing-grid";
import { Alert } from "@/components/auth/parts";
import { CoinStack, Sparkle } from "@/components/decor";
import { requireUser } from "@/lib/profile";
import { getPricingContext } from "@/lib/geo";
import { getPricing, listOrders } from "@/lib/orders-server";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.billing.title };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trial?: string }>;
}) {
  const { status, trial } = await searchParams;
  const { t, locale } = await getDictionary();
  const b = t.app.billing;
  const { supabase, profile } = await requireUser();
  const [{ country, book }, grid, firstOrders] = await Promise.all([
    getPricingContext(),
    getPricing(supabase),
    status === "success" ? listOrders(supabase, 1) : Promise.resolve(null),
  ]);
  // Paiement réussi et aucune commande encore : on propose directement la première vidéo.
  const firstVideo = firstOrders !== null && firstOrders.length === 0;

  const notice =
    status === "soon" ? { tone: "info" as const, text: b.soon } :
    status === "canceled" ? { tone: "info" as const, text: b.canceled } :
    status === "success" ? { tone: "success" as const, text: b.success } :
    status === "invalid_amount" ? { tone: "error" as const, text: b.invalidAmount } : null;

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute end-0 top-0 hidden items-end gap-1 text-brand-text sm:flex" aria-hidden>
          <Sparkle className="mb-10 h-4 w-4" />
          <CoinStack count={3} className="h-16 w-16" />
        </div>
        <h1 className="page-title">{b.title}</h1>
        <p className="page-sub">{b.sub}</p>
        <p className="mt-6 inline-flex rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-text">
          {fmt(b.balance, { n: new Intl.NumberFormat(locale).format(profile.token_balance) })}
        </p>
      </div>
      {notice && (
        <div className="mt-6 max-w-2xl">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}
      {firstVideo && (
        <div className="card mt-4 flex max-w-2xl flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.01em]">{b.nextTitle}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{b.nextBody}</p>
          </div>
          <Link href="/videos/new" className="btn btn-primary btn-md shrink-0 self-start sm:self-center">
            <Plus size={18} aria-hidden /> {t.app.dashboard.firstCta}
          </Link>
        </div>
      )}
      <div className="mt-10">
        <PricingGrid book={book} grid={grid} country={country} signedIn prefillMin={trial === "1"} />
      </div>
    </div>
  );
}
