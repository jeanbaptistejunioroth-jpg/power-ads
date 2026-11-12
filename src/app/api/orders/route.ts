import { NextResponse } from "next/server";
import { apiError, apiUser, readJson } from "@/lib/api";
import { orderSchema } from "@/lib/order";
import { dispatchOrder } from "@/lib/engine";
import { getPricing } from "@/lib/orders-server";
import { grantWelcomeBonus } from "@/lib/welcome-bonus";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Passe une commande : validation, prix recalculé et tokens débités en base (place_order_for),
 * puis envoi signé au moteur n8n. Le montant ne vient jamais du navigateur.
 * place_order_for n'est appelable qu'avec la clé serveur : impossible de contourner cette validation.
 */
export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return apiError("unauthorized", 401);

  const parsed = orderSchema.safeParse(await readJson(request, 120_000));
  if (!parsed.success) return apiError("invalid_order", 400);
  const o = parsed.data;

  // Le total affiché au client doit être celui de la grille (style × durée) au moment de la commande :
  // si les prix ont changé depuis l'ouverture de la page, on refuse AVANT tout débit.
  const grid = await getPricing(supabase);
  const expected = grid[o.video_style][o.duration_s] * o.scripts.length;
  if (o.quoted_tokens !== expected) return apiError("price_changed", 409);

  const { data, error } = await createAdminClient().rpc("place_order_for", {
    p_user: user.id,
    p_order: {
      product: o.product,
      audience: o.audience,
      language: o.language,
      style: o.style,
      duration_s: o.duration_s,
      aspect_ratio: o.aspect_ratio,
      video_style: o.video_style,
      script_mode: o.script_mode,
      scripts: o.scripts,
      whatsapp: o.whatsapp,
    },
  });

  if (error) {
    if (error.message.includes("insufficient_tokens")) return apiError("insufficient_tokens", 402);
    if (error.message.includes("invalid_duration")) return apiError("invalid_order", 400);
    console.error("[orders] place_order_for", error);
    return apiError("order_failed", 500);
  }

  const row = (Array.isArray(data) ? data[0] : data) as { order_id: string; order_ref: string; total_tokens: number; balance_after: number };
  if (row.total_tokens !== expected) {
    // Ne devrait jamais arriver (même grille) : signalé pour enquête, la commande reste valide.
    console.error("[orders] écart de prix", row.order_ref, { expected, debited: row.total_tokens });
  }

  // Mémorise le WhatsApp sur le profil pour les prochaines commandes (refusé s'il appartient à un autre compte).
  if (o.whatsapp) {
    const { error: waError } = await supabase.from("profiles").update({ whatsapp: o.whatsapp }).eq("id", user.id);
    if (!waError) await grantWelcomeBonus(user.id);
  }

  // L'envoi au moteur n'empêche pas la commande d'exister : en cas d'échec, elle reste
  // « en attente » et pourra être renvoyée (back-office, chantier E).
  try {
    const dispatch = await dispatchOrder(row.order_id);
    if (!dispatch.ok && !dispatch.skipped) console.error("[orders] envoi au moteur", row.order_ref, dispatch.error);
  } catch (e) {
    console.error("[orders] envoi au moteur", row.order_ref, e);
  }

  return NextResponse.json({ id: row.order_id, ref: row.order_ref, balance: row.balance_after }, { status: 201 });
}
