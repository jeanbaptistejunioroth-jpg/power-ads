import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";
import { Alert } from "@/components/auth/parts";
import { GoogleDriveIcon } from "@/components/brand-icons";
import { StatusBadge } from "@/components/videos/status-badge";
import { LiveRefresh } from "@/components/videos/live-refresh";
import { requireUser } from "@/lib/profile";
import { getOrder } from "@/lib/orders-server";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.videos.title };
}

function audienceLabels(audience: Record<string, unknown>, t: Dictionary) {
  const o = t.app.order.audience.options;
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
  return [
    ...list(audience.regions).map((r) => o.regions[r as keyof typeof o.regions] ?? r),
    o.gender[audience.gender as keyof typeof o.gender] ?? String(audience.gender ?? ""),
    ...list(audience.ages),
    ...list(audience.appearances).map((a) => o.appearances[a as keyof typeof o.appearances] ?? a),
    o.tone[audience.tone as keyof typeof o.tone] ?? String(audience.tone ?? ""),
  ].filter(Boolean);
}

export default async function OrderPage({ params, searchParams }: { params: Params; searchParams: Promise<{ new?: string }> }) {
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const { t, locale } = await getDictionary();
  const v = t.app.videos;
  const d = v.detail;
  const { supabase } = await requireUser();
  const order = await getOrder(supabase, id);
  if (!order) notFound();

  const nf = new Intl.NumberFormat(locale);
  const placed = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(order.created_at));
  const live = !["completed", "partial", "failed"].includes(order.status);

  return (
    <div>
      {live && <LiveRefresh orderId={order.id} />}
      <Link href="/videos" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden /> {d.back}
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title truncate">{order.product.name}</h1>
          <p className="page-sub">
            {order.ref} · {fmt(d.placed, { date: placed })}
          </p>
        </div>
        <StatusBadge status={order.status} label={v.orderStatus[order.status]} />
      </div>

      {isNew && (
        <div className="mt-6 max-w-3xl">
          <Alert tone="success">{order.whatsapp ? d.newBanner : d.newBannerNoWa}</Alert>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="text-sm font-medium text-ink-3">{d.videos}</h2>
          <ul className="mt-3 space-y-3">
            {order.order_videos.map((video) => (
              <li key={video.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{fmt(d.video, { n: video.position })}</p>
                    <p className="mt-0.5 text-sm text-ink-3">
                      {fmt(t.common.seconds, { n: video.duration_s })} · {order.aspect_ratio} · {nf.format(video.tokens)} {t.common.tokens}
                    </p>
                  </div>
                  <StatusBadge status={video.status} label={v.videoStatus[video.status]} />
                </div>

                {video.status === "delivered" && video.drive_url && (
                  <a href={video.drive_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md mt-4">
                    <GoogleDriveIcon className="h-[18px] w-[18px]" />
                    {d.openDrive}
                    <ExternalLink size={15} className="text-ink-3" aria-hidden />
                  </a>
                )}
                {video.status === "failed" && (
                  <div className="mt-4">
                    <Alert>{video.refunded ? fmt(d.refunded, { n: nf.format(video.tokens) }) : t.common.genericError}</Alert>
                  </div>
                )}

                <details className="group mt-4 border-t border-line pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                    {d.script}
                    <ChevronDown size={17} className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{video.script}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            {order.product.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.product.images[0]} alt="" className="aspect-[4/3] w-full border-b border-line object-cover" />
            )}
            <div className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-ink-3">{d.product}</p>
                <p className="mt-1 font-medium">{order.product.name}</p>
              </div>
              <div>
                <p className="text-ink-3">{d.audience}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {audienceLabels(order.audience, t).map((label) => (
                    <li key={label} className="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2">
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-ink-3">{d.style}</p>
                <p className="mt-1 font-medium">
                  {t.app.order.format.styles[(order.video_style ?? "mixed") as keyof typeof t.app.order.format.styles]?.name}
                </p>
              </div>
              <p className="text-ink-2">{d.scriptBy[order.script_mode]}</p>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="text-ink-3">{d.total}</span>
                <span className="font-semibold tabular-nums">
                  {nf.format(order.total_tokens)} {t.common.tokens}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
