import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Adresse Supabase autorisée pour les appels API et le temps réel du navigateur.
function supabaseOrigins() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { http: url.origin, ws: url.origin.replace(/^http/, "ws") };
  } catch {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
}

const supabase = supabaseOrigins();
// Cloudflare Turnstile : anti-robots des formulaires de connexion et d'inscription.
const TURNSTILE = "https://challenges.cloudflare.com";

// Politique de contenu : le navigateur refuse tout script, cadre ou connexion non listé ici.
// 'unsafe-inline' reste nécessaire aux scripts d'amorçage de Next.js et du thème clair/sombre.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${supabase.http}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase.http} ${supabase.ws}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${TURNSTILE}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Empêche d'afficher le site dans un cadre caché sur un autre site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HTTPS obligatoire pendant 2 ans (production uniquement : en local le site est en http).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Vidéos et aperçus de démonstration : gardés une semaine par le navigateur.
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
