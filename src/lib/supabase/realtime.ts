import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Abonnement temps réel qui transmet d'abord la session au serveur Realtime.
 * Sans jeton au moment de l'abonnement, la base (RLS) le traite comme anonyme
 * et n'envoie aucun changement. Renvoie la fonction de désabonnement.
 */
export function subscribeWithSession(supabase: SupabaseClient, channel: () => RealtimeChannel) {
  let active: RealtimeChannel | null = null;
  let cancelled = false;
  void supabase.realtime.setAuth().finally(() => {
    if (!cancelled) active = channel().subscribe();
  });
  return () => {
    cancelled = true;
    if (active) void supabase.removeChannel(active);
  };
}
