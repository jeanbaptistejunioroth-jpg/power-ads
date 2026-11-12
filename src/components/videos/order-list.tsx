import Link from "next/link";
import { ChevronRight, ImageOff } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { PlayButton } from "@/components/decor";
import { fmt } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import type { OrderSummary } from "@/lib/orders-server";

/** Liste des commandes (page « Mes vidéos » et tableau de bord). */
export function OrderList({ orders, t, locale }: { orders: OrderSummary[]; t: Dictionary; locale: string }) {
  const v = t.app.videos;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const nf = new Intl.NumberFormat(locale);

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {orders.map((o) => {
        const duration = o.order_videos[0]?.duration_s ?? 0;
        const delivered = o.order_videos.filter((x) => x.status === "delivered").length;
        return (
          <li key={o.id}>
            <Link href={`/videos/${o.id}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-sunken sm:px-5">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-sunken">
                {o.product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageOff size={18} className="absolute inset-0 m-auto text-ink-3" aria-hidden />
                )}
                <span className="absolute bottom-1 end-1 opacity-90">
                  <PlayButton tone="white" pulse={false} className="h-5 w-5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.product.name}</span>
                <span className="mt-0.5 block truncate text-sm text-ink-3">
                  {o.ref} · {date.format(new Date(o.created_at))} · {fmt(v.summary, { count: o.video_count, duration, ratio: o.aspect_ratio })}
                  {delivered > 0 && delivered < o.video_count ? ` · ${fmt(v.deliveredCount, { n: delivered, total: o.video_count })}` : ""}
                </span>
                <span className="mt-2 block sm:hidden">
                  <StatusBadge status={o.status} label={v.orderStatus[o.status]} />
                </span>
              </span>
              <span className="hidden text-end text-sm tabular-nums text-ink-2 sm:block">
                {nf.format(o.total_tokens)} {t.common.tokens}
              </span>
              <span className="hidden sm:block">
                <StatusBadge status={o.status} label={v.orderStatus[o.status]} />
              </span>
              <ChevronRight size={18} className="hidden shrink-0 text-ink-3 sm:block rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
