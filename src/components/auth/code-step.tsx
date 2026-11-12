"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { OtpInput, OTP_LENGTH } from "./otp-input";
import { Alert, Spinner } from "./parts";

const RESEND_DELAY = 60;

/** Étape "code reçu par e-mail" : vérifie le code et ouvre la session. */
export function CodeStep({
  email,
  resend,
  onVerified,
  onBack,
}: {
  email: string;
  resend: () => Promise<string | null>;
  onVerified: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const s = t.auth.signup;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_DELAY);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      setError(s.invalidCode);
      setCode("");
      return;
    }
    onVerified();
  }

  // Vérification automatique dès que tous les chiffres sont saisis.
  useEffect(() => {
    if (code.length === OTP_LENGTH) void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleResend() {
    setError(null);
    setInfo(null);
    const err = await resend();
    if (err) setError(err);
    else {
      setInfo(s.resent);
      setCooldown(RESEND_DELAY);
    }
  }

  return (
    <form onSubmit={verify} className="space-y-6">
      <div>
        <h2 className="text-[2.25rem] font-medium leading-tight tracking-[-0.02em]">{s.codeHeading}</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
          {fmt(s.codeSub, { n: OTP_LENGTH, email })}
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <OtpInput value={code} onChange={setCode} label={s.codeLabel} disabled={loading} />
      <button type="submit" disabled={loading || code.length !== OTP_LENGTH} className="btn btn-primary btn-lg w-full">
        {loading && <Spinner />}
        {s.verify}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
          <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden /> {t.common.back}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-medium text-brand-text disabled:text-ink-3"
        >
          {cooldown > 0 ? fmt(s.resendIn, { s: cooldown }) : s.resend}
        </button>
      </div>
    </form>
  );
}
