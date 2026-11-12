"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { GoogleButton } from "./google-button";
import { authErrorMessage, useCaptcha } from "./captcha";
import { Alert, AuthHeading, Divider, LegalNote, PasswordInput, Spinner, safeNext } from "./parts";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const { t } = useI18n();
  const l = t.auth.login;
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const target = safeNext(next);
  const { widget, getToken } = useCaptcha();

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const captchaToken = await getToken();
    const { error } = await createClient().auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error, t, l.invalid));
      return;
    }
    router.replace(target);
    router.refresh();
  }

  return (
    <div>
      <AuthHeading title={l.heading} prompt={l.newHere} linkLabel={l.createAccount} href="/signup" />

      <div className="mt-9">
        <GoogleButton next={target} onError={setError} />
      </div>
      <Divider label={t.auth.orEmail} />

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}

      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setStep("password");
          }}
          className="space-y-6"
        >
          <div>
            <label htmlFor="email" className="label">{t.common.email}</label>
            <input
              id="email"
              type="email"
              className="field"
              placeholder={t.common.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              autoComplete="email"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full">
            {t.common.continue} <ArrowRight size={18} className="rtl:-scale-x-100" />
          </button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="label mb-0 truncate normal-case tracking-normal">
                {fmt(l.passwordFor, { email })}
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setError(null);
                }}
                className="shrink-0 text-sm font-medium text-brand-text"
              >
                {l.changeEmail}
              </button>
            </div>
            <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
            <div className="mt-3 text-end">
              <Link
                href={`/forgot-password?email=${encodeURIComponent(email)}`}
                className="text-sm font-medium text-ink-2 hover:text-ink"
              >
                {l.forgot}
              </Link>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading && <Spinner />}
            {l.submit}
          </button>
        </form>
      )}

      {widget}
      <LegalNote />
    </div>
  );
}
