import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SettingsPanels } from "@/components/settings/settings-panels";
import { requireUser } from "@/lib/profile";
import { getDictionary } from "@/lib/i18n/server";
import { CURRENCY_COOKIE, isCurrencyCode } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.app.settings.title };
}

export default async function SettingsPage() {
  const { t } = await getDictionary();
  const { user, profile } = await requireUser();
  const manual = (await cookies()).get(CURRENCY_COOKIE)?.value;

  return (
    <div>
      <h1 className="page-title">{t.app.settings.title}</h1>
      <SettingsPanels
        userId={user.id}
        name={profile.full_name ?? ""}
        email={user.email ?? ""}
        whatsapp={profile.whatsapp ?? ""}
        avatarUrl={profile.avatar_url}
        manualCurrency={isCurrencyCode(manual) ? manual : null}
      />
    </div>
  );
}
