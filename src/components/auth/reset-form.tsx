"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { CodeStep } from "./code-step";
import { PasswordStep } from "./password-step";
import { StepDots } from "./step-dots";
import { authErrorMessage, useCaptcha } from "./captcha";
import { Alert, AuthHeading, LegalNote, Spinner } from "./parts";

export function ResetForm({ initialEmail = "" }: { initialEmail?: string }) {
  const { t } = useI18n();
  const r = t.auth.reset;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { widget, getToken } = useCaptcha();

  async function sendCode(): Promise<string | null> {
    const captchaToken = await getToken();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, captchaToken },
    });
    if (!error) return null;
    // Supabase refuse l'OTP si aucun compte n'existe (création désactivée ici).
    if (error.status !== 429 && /signups? not allowed|not found/i.test(error.message)) return r.noAccount;
    return authErrorMessage(error, t, t.common.genericError);
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await sendCode();
    setLoading(false);
    if (err) return setError(err);
    setStep(1);
  }

  return (
    <div>
      <StepDots steps={t.auth.signup.steps} current={step} />
      {step === 0 && (
        <>
          <AuthHeading title={r.heading} prompt={r.remember} linkLabel={t.common.signIn} href="/login" />
          <form onSubmit={submitEmail} className="mt-9 space-y-6">
            {error && <Alert>{error}</Alert>}
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
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading && <Spinner />}
              {r.sendCode} {!loading && <ArrowRight size={18} className="rtl:-scale-x-100" />}
            </button>
          </form>
          <LegalNote />
        </>
      )}
      {step === 1 && (
        <CodeStep email={email} resend={sendCode} onVerified={() => setStep(2)} onBack={() => setStep(0)} />
      )}
      {step === 2 && (
        <PasswordStep
          title={t.auth.signup.passwordHeading}
          submitLabel={r.submit}
          onDone={() => {
            router.replace("/dashboard");
            router.refresh();
          }}
        />
      )}

      {/* Hors des étapes : « Renvoyer le code » a aussi besoin du CAPTCHA. */}
      {widget}
    </div>
  );
}
