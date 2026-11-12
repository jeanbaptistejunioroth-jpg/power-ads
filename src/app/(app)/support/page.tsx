import type { Metadata } from "next";
import { SupportChat, type SupportMessage } from "@/components/support/chat";
import { requireUser } from "@/lib/profile";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.support.title };
}

export default async function SupportPage() {
  const { t } = await getDictionary();
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div>
      <h1 className="page-title">{t.app.support.title}</h1>
      <p className="page-sub">{t.app.support.sub}</p>
      <div className="mt-8">
        <SupportChat userId={user.id} initial={(data as SupportMessage[] | null) ?? []} />
      </div>
    </div>
  );
}
