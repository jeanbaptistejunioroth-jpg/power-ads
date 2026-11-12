import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Tokens offerts une fois, au premier enregistrement d'un numéro WhatsApp unique. 0 = désactivé. */
export function welcomeBonusTokens() {
  const n = Number(process.env.WELCOME_BONUS_TOKENS ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Crédite le bonus de bienvenue si WELCOME_BONUS_TOKENS > 0. Toutes les vérifications sont dans la
 * fonction SQL grant_welcome_bonus (migration 0006) : numéro utilisé par ce seul compte, jamais
 * récompensé auparavant, crédit idempotent (external_ref « welcome:<user_id> »).
 * N'échoue jamais : au pire, le bonus n'est pas versé.
 */
export async function grantWelcomeBonus(userId: string) {
  const amount = welcomeBonusTokens();
  if (!amount) return false;
  try {
    const { data, error } = await createAdminClient().rpc("grant_welcome_bonus", { p_user: userId, p_amount: amount });
    if (error) {
      console.error("[welcome-bonus]", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("[welcome-bonus]", e);
    return false;
  }
}
