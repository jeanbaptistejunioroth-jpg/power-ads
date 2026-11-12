import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { safeNext } from "@/lib/redirect";
import { TRIAL_COOKIE, TRIAL_PATH } from "@/lib/trial";

/** Retour de Google (OAuth) : échange le code contre une session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Sans `next`, une inscription commencée par l'offre d'essai mène quand même à Billing.
  const trial = (await cookies()).get(TRIAL_COOKIE)?.value === "1";
  const next = safeNext(searchParams.get("next"), trial ? TRIAL_PATH : "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Premier passage via Google : mémoriser la langue détectée.
      await supabase
        .from("profiles")
        .update({ locale: await getLocale() })
        .eq("id", data.user.id)
        .is("locale", null);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
