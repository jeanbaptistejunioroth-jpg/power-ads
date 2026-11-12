import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string | null;
  locale: string | null;
  token_balance: number;
  whatsapp: string | null;
  avatar_url: string | null;
};

/** Utilisateur connecté + profil. Redirige vers /login si pas de session. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Colonnes ajoutées par les migrations 0002 (whatsapp) et 0005 (avatar_url) : on dégrade proprement si absentes.
  let profile: Partial<Profile> | null = null;
  for (const columns of [
    "id, full_name, locale, token_balance, whatsapp, avatar_url",
    "id, full_name, locale, token_balance, whatsapp",
    "id, full_name, locale, token_balance",
  ]) {
    const { data, error } = await supabase.from("profiles").select(columns).eq("id", user.id).maybeSingle<Partial<Profile>>();
    if (!error) {
      profile = data;
      break;
    }
  }

  const meta = user.user_metadata ?? {};
  const googlePhoto = typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("https://") ? meta.avatar_url : null;

  return {
    supabase,
    user,
    profile: {
      id: user.id,
      full_name: (meta.full_name as string | undefined) ?? null,
      locale: null,
      token_balance: 0,
      ...profile,
      whatsapp: profile?.whatsapp ?? null,
      avatar_url: profile?.avatar_url ?? googlePhoto,
    } satisfies Profile,
  };
}
