import { NextResponse } from "next/server";
import { apiError, apiUser, rateLimit, readJson } from "@/lib/api";
import { ImportError, importFromShopify } from "@/lib/shopify";

export const runtime = "nodejs";

/** Importe un produit (ou le catalogue) d'une boutique Shopify à partir de son adresse. */
export async function POST(request: Request) {
  const { user } = await apiUser();
  if (!user) return apiError("unauthorized", 401);

  const body = await readJson<{ url?: unknown }>(request, 4_000);
  if (!body || typeof body.url !== "string" || body.url.length > 2048) return apiError("invalid_url", 400);

  // Chaque import fait télécharger une page au serveur : 30 par heure et par compte.
  const limited = await rateLimit(user.id, "shopify_import", 30, 3600);
  if (limited) return limited;

  try {
    return NextResponse.json(await importFromShopify(body.url));
  } catch (e) {
    const code = e instanceof ImportError ? e.code : "unreachable";
    return apiError(code, code === "invalid_url" ? 400 : 422);
  }
}
