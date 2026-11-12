"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { Spinner } from "./parts";
import { GoogleIcon } from "@/components/brand-icons";

export function GoogleButton({ next = "/dashboard", onError }: { next?: string; onError: (msg: string) => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setLoading(false);
      onError(t.common.genericError);
    }
    // En cas de succès, le navigateur part vers Google : pas de reset du loader.
  }

  return (
    <button type="button" onClick={handle} disabled={loading} className="btn btn-ghost btn-lg w-full font-semibold">
      {loading ? <Spinner /> : <GoogleIcon />}
      {t.auth.google}
    </button>
  );
}
