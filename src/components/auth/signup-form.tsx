"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { TRIAL_PATH } from "@/lib/trial";
import { GoogleButton } from "./google-button";
import { CodeStep } from "./code-step";
import { PasswordStep } from "./password-step";
import { StepDots } from "./step-dots";
import { authErrorMessage, useCaptcha } from "./captcha";
import { Alert, AuthHeading, Divider, LegalNote, Spinner } from "./parts";

export function SignupForm({ trial = false }: { trial?: boolean }) {
  const { t, locale } = useI18n();
  const s = t.auth.signup;
  const router = useRouter();
  // Offre d'essai : une fois le compte créé, direction Billing avec le montant minimum.
  const next = trial ? TRIAL_PATH : "/dashboard";
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { widget, getToken } = useCaptcha();

  async function sendCode(): Promise<string | null> {
    const captchaToken = await getToken();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { full_name: name, locale }, captchaToken },
    });
    if (!error) return null;
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
      <StepDots steps={s.steps} current={step} />

      {step === 0 && (
        <>
          <AuthHeading title={s.heading} prompt={s.haveAccount} linkLabel={s.signInLink} href="/login" />
          <div className="mt-9">
            <GoogleButton next={next} onError={setError} />
          </div>
          <Divider label={t.auth.orEmail} />
          {error && <div className="mb-5"><Alert>{error}</Alert></div>}
          <form onSubmit={submitEmail} className="space-y-6">
            <div>
              <label htmlFor="name" className="label">{s.name}</label>
              <input
                id="name"
                className="field"
                placeholder={s.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
                required
                maxLength={80}
              />
            </div>
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
              {loading ? <Spinner /> : null}
              {s.sendCode} {!loading && <ArrowRight size={18} className="rtl:-scale-x-100" />}
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
          title={s.passwordHeading}
          submitLabel={s.createPassword}
          extraData={{ full_name: name }}
          onDone={() => {
            router.replace(next);
            router.refresh();
          }}
        />
      )}

      {/* Hors des étapes : « Renvoyer le code » a aussi besoin du CAPTCHA. */}
      {widget}
    </div>
  );
}
