import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Réponse d'erreur JSON homogène : { error: "code" }. */
export function apiError(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

/** Utilisateur connecté pour une route API (null si pas de session). */
export async function apiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Limite anti-abus par compte (fonction SQL hit_rate_limit, migration 0004).
 * Renvoie une réponse 429 si la limite est atteinte, 503 si la vérification est impossible
 * (on refuse plutôt que de laisser passer sans contrôle), sinon null.
 */
export async function rateLimit(userId: string, action: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_user: userId,
    p_action: action,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] vérification impossible (migration 0004 exécutée ?)", action, error.message);
    return apiError("unavailable", 503);
  }
  return data === false ? apiError("rate_limited", 429) : null;
}

export async function readJson<T = unknown>(request: Request, maxBytes = 200_000): Promise<T | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
