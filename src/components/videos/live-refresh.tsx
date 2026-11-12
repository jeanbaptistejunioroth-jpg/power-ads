"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithSession } from "@/lib/supabase/realtime";

/** Rafraîchit la page dès que le moteur met à jour la commande ou une de ses vidéos. */
export function LiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    return subscribeWithSession(supabase, () =>
      supabase
        .channel(`order:${orderId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_videos", filter: `order_id=eq.${orderId}` }, () => router.refresh())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => router.refresh()),
    );
  }, [orderId, router]);
  return null;
}
