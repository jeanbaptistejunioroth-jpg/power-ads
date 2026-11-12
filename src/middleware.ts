import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Mode vitrine (SHOWCASE_MODE=1, défini uniquement sur Vercel) : seules la page d'accueil
// et les pages légales sont visibles. Comptes, paiements et API sont fermés, et le site
// n'est pas indexé par les moteurs de recherche.
const SHOWCASE = process.env.SHOWCASE_MODE === "1";
const NO_INDEX = "noindex, nofollow, noarchive";

function showcase(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    const res = NextResponse.json({ error: "unavailable" }, { status: 503 });
    res.headers.set("X-Robots-Tag", NO_INDEX);
    return res;
  }

  const allowed = path === "/" || path.startsWith("/legal/");
  const res = allowed
    ? NextResponse.next({ request })
    : NextResponse.redirect(new URL("/", request.url));
  res.headers.set("X-Robots-Tag", NO_INDEX);
  return res;
}

export async function middleware(request: NextRequest) {
  if (SHOWCASE) return showcase(request);
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
