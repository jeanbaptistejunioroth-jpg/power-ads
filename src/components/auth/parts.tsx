"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function AuthHeading({
  title,
  prompt,
  linkLabel,
  href,
}: {
  title: string;
  prompt?: string;
  linkLabel?: string;
  href?: string;
}) {
  return (
    <div>
      <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h2>
      {prompt && href && (
        <p className="mt-3 text-base text-ink-2">
          {prompt}{" "}
          <Link href={href} className="font-medium text-brand-text hover:underline hover:underline-offset-4">
            {linkLabel}
          </Link>
        </p>
      )}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-7 flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-sm text-ink-3">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LegalNote() {
  const { t } = useI18n();
  return (
    <p className="mt-8 text-center text-sm leading-relaxed text-ink-3">
      {t.auth.legalPrefix}{" "}
      <Link href="/legal/cgv" className="text-ink-2 underline underline-offset-2 hover:text-ink">
        {t.auth.terms}
      </Link>{" "}
      {t.auth.and}{" "}
      <Link href="/legal/confidentialite" className="text-ink-2 underline underline-offset-2 hover:text-ink">
        {t.auth.privacy}
      </Link>
      .
    </p>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const isError = tone === "error";
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-brand-soft text-brand-text",
  }[tone];
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${styles}`}
    >
      {tone === "success" ? (
        <CheckCircle2 size={17} className="mt-px shrink-0" />
      ) : (
        <AlertCircle size={17} className="mt-px shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className="field pe-12"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute end-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
        aria-label={show ? t.common.hidePassword : t.common.showPassword}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden
    />
  );
}

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export { safeNext } from "@/lib/redirect";
