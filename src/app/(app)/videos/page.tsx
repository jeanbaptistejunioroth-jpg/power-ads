import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OrderList } from "@/components/videos/order-list";
import { EmptyState } from "@/components/videos/empty-state";
import { requireUser } from "@/lib/profile";
import { listOrders } from "@/lib/orders-server";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.videos.title };
}

export default async function VideosPage() {
  const { t, locale } = await getDictionary();
  const v = t.app.videos;
  const { supabase } = await requireUser();
  const orders = await listOrders(supabase);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{v.title}</h1>
          <p className="page-sub">{v.sub}</p>
        </div>
        {orders.length > 0 && (
          <Link href="/videos/new" className="btn btn-primary btn-md">
            <Plus size={18} aria-hidden /> {t.app.nav.newVideo}
          </Link>
        )}
      </div>

      <div className="mt-8">
        {orders.length ? (
          <OrderList orders={orders} t={t} locale={locale} />
        ) : (
          <EmptyState title={v.emptyTitle} body={v.emptyBody} cta={v.emptyCta} />
        )}
      </div>
    </div>
  );
}
