import type { Metadata } from "next";
import { OrderWizard } from "@/components/order/order-wizard";
import { requireUser } from "@/lib/profile";
import { getPricing } from "@/lib/orders-server";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.order.title };
}

export default async function NewVideoPage() {
  const { supabase, user, profile } = await requireUser();
  const pricing = await getPricing(supabase);
  return (
    <OrderWizard
      userId={user.id}
      balance={profile.token_balance}
      whatsapp={profile.whatsapp ?? ""}
      pricing={pricing}
    />
  );
}
