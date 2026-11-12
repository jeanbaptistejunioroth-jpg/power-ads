import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client "service role" : contourne la RLS. À utiliser UNIQUEMENT côté serveur.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
