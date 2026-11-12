"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { Alert, PASSWORD_RULE, PasswordInput, Spinner } from "./parts";

/** Étape "choix du mot de passe" (session déjà ouverte après le code). */
export function PasswordStep({
  title,
  submitLabel,
  extraData,
  onDone,
}: {
  title: string;
  submitLabel: string;
  extraData?: Record<string, string>;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const s = t.auth.signup;
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PASSWORD_RULE.test(pwd)) return setError(s.weak);
    if (pwd !== confirm) return setError(s.mismatch);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: pwd, data: extraData });
    setLoading(false);
    if (error) return setError(error.message.includes("different") ? s.weak : t.common.genericError);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-[2.25rem] font-medium leading-tight tracking-[-0.02em]">{title}</h2>
        <p className="mt-3 text-[17px] text-ink-2">{s.passwordSub}</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div>
        <label htmlFor="new-password" className="label">{s.newPassword}</label>
        <PasswordInput id="new-password" value={pwd} onChange={setPwd} autoComplete="new-password" autoFocus />
        <Strength value={pwd} />
      </div>
      <div>
        <label htmlFor="confirm-password" className="label">{s.confirmPassword}</label>
        <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
        {loading && <Spinner />}
        {submitLabel}
      </button>
    </form>
  );
}

function Strength({ value }: { value: string }) {
  const score =
    (value.length >= 8 ? 1 : 0) +
    (/[A-Za-z]/.test(value) && /\d/.test(value) ? 1 : 0) +
    (value.length >= 12 || /[^A-Za-z0-9]/.test(value) ? 1 : 0);
  const colors = ["bg-line", "bg-danger", "bg-[#d99a1e]", "bg-success"];
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1 rounded-full ${score >= i ? colors[score] : "bg-line"}`} />
      ))}
    </div>
  );
}
