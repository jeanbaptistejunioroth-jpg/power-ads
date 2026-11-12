import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { countryFromHeaders, detectLocale, LOCALE_COOKIE, isLocale, regionFromHeaders } from "@/lib/i18n/config";
import { TRIAL_COOKIE, TRIAL_PATH } from "@/lib/trial";

const PROTECTED = ["/dashboard", "/videos", "/billing", "/support", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cookies de session envoyés uniquement en HTTPS en production.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne rien intercaler entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.includes(path);
  // Inscription commencée par l'offre d'essai : à la sortie, direction Billing (montant minimum).
  const trialStart = path === "/signup" && request.nextUrl.searchParams.get("trial") === "1";
  const trialPending = trialStart || request.cookies.get(TRIAL_COOKIE)?.value === "1";

  let redirect: NextResponse | null = null;
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    redirect = NextResponse.redirect(url);
  } else if (user && isAuthPage) {
    redirect = NextResponse.redirect(new URL(trialPending ? TRIAL_PATH : "/dashboard", request.url));
  }

  const out = redirect ?? response;
  if (redirect) {
    // Conserver les cookies de session rafraîchis sur la redirection.
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
  }

  if (trialStart && !user) {
    out.cookies.set(TRIAL_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 2,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  } else if (user && path === "/billing" && request.cookies.has(TRIAL_COOKIE)) {
    out.cookies.delete(TRIAL_COOKIE);
  }

  // Langue : détectée une seule fois d'après le pays (et le navigateur), puis mémorisée.
  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(current)) {
    const get = (name: string) => request.headers.get(name);
    const locale = detectLocale(request.headers.get("accept-language"), countryFromHeaders(get), regionFromHeaders(get));
    out.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return out;
}
