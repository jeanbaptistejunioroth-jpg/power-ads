"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { setLocaleCookie } from "@/components/language-switcher";
import { CurrencyOptions, setCurrencyCookie } from "@/components/pricing/pricing-grid";
import { AvatarPicker } from "./avatar-picker";
import { Alert, PASSWORD_RULE, PasswordInput, Spinner } from "@/components/auth/parts";
import { deleteAccount, updateLocale, updateProfile } from "@/app/(app)/settings/actions";

function Section({ title, sub, children, danger }: { title: string; sub: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`grid gap-6 border-t py-10 md:grid-cols-[1fr_1.4fr] ${danger ? "border-danger/30" : "border-line"}`}>
      <div>
        <h2 className={`text-lg font-semibold tracking-[-0.01em] ${danger ? "text-danger" : ""}`}>{title}</h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{sub}</p>
      </div>
      <div className="max-w-lg space-y-5">{children}</div>
    </section>
  );
}

export function SettingsPanels({
  userId,
  name,
  email,
  whatsapp,
  avatarUrl,
  manualCurrency,
}: {
  userId: string;
  name: string;
  email: string;
  whatsapp: string;
  avatarUrl: string | null;
  manualCurrency: string | null;
}) {
  const { t, locale } = useI18n();
  const s = t.app.settings;
  const router = useRouter();

  /* ── Profil ── */
  const [fullName, setFullName] = useState(name);
  const [phone, setPhone] = useState(whatsapp);
  const [profileState, setProfileState] = useState<"idle" | "saving" | "saved" | "error" | "phone" | "taken">("idle");

  /* ── Préférences ── */
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [prefPending, startPref] = useTransition();

  /* ── Mot de passe ── */
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  /* ── Suppression ── */
  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState(false);

  return (
    <div className="mt-8">
      <Section title={s.profile.title} sub={s.profile.sub}>
        <AvatarPicker userId={userId} name={name || email} url={avatarUrl} />
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setProfileState("saving");
            const res = await updateProfile(fullName, phone);
            setProfileState(
              res.ok ? "saved" : "field" in res && res.field === "whatsapp" ? "phone" : "field" in res && res.field === "whatsapp_taken" ? "taken" : "error",
            );
            router.refresh();
          }}
        >
          <div>
            <label htmlFor="fullName" className="label">{s.profile.name}</label>
            <input id="fullName" className="field" value={fullName} maxLength={80} onChange={(e) => { setFullName(e.target.value); setProfileState("idle"); }} />
          </div>
          <div>
            <label htmlFor="whatsapp" className="label">{s.profile.whatsapp}</label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="field"
              placeholder="+237 6 90 00 00 00"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setProfileState("idle"); }}
            />
            <p className="hint">{s.profile.whatsappHint}</p>
          </div>
          <div>
            <label htmlFor="emailRo" className="label">{s.profile.email}</label>
            <input id="emailRo" className="field" value={email} disabled />
            <p className="hint">{s.profile.emailHint}</p>
          </div>
          {profileState === "saved" && <Alert tone="success">{t.common.saved}</Alert>}
          {profileState === "error" && <Alert>{t.common.genericError}</Alert>}
          {profileState === "phone" && <Alert>{s.profile.whatsappInvalid}</Alert>}
          {profileState === "taken" && <Alert>{s.profile.whatsappTaken}</Alert>}
          <button type="submit" disabled={profileState === "saving"} className="btn btn-primary btn-md">
            {profileState === "saving" && <Spinner />}
            {profileState === "saving" ? t.common.saving : t.common.save}
          </button>
        </form>
      </Section>

      <Section title={s.preferences.title} sub={s.preferences.sub}>
        <div>
          <label htmlFor="pref-lang" className="label">{t.common.language}</label>
          <select
            id="pref-lang"
            className="field cursor-pointer"
            value={locale}
            disabled={prefPending}
            onChange={(e) => {
              const next = e.target.value as Locale;
              setLocaleCookie(next);
              startPref(async () => {
                await updateLocale(next);
                router.refresh();
              });
            }}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l} lang={l}>{LOCALE_NAMES[l]}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="label">{t.common.theme.label}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTheme(v)}
                aria-pressed={mounted && theme === v}
                className={`h-11 rounded-xl border text-sm font-medium ${
                  mounted && theme === v ? "border-brand bg-brand-soft text-brand-text" : "border-line bg-elev text-ink-2 hover:text-ink"
                }`}
              >
                {t.common.theme[v]}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="pref-currency" className="label">{s.preferences.currency}</label>
          <select
            id="pref-currency"
            className="field cursor-pointer"
            defaultValue={manualCurrency ?? "auto"}
            onChange={(e) => {
              setCurrencyCookie(e.target.value);
              router.refresh();
            }}
          >
            <option value="auto">{s.preferences.currencyAuto}</option>
            <CurrencyOptions />
          </select>
        </div>
      </Section>

      <Section title={s.security.title} sub={s.security.sub}>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwdMsg(null);
            if (!PASSWORD_RULE.test(pwd)) return setPwdMsg({ tone: "error", text: t.auth.signup.weak });
            if (pwd !== pwd2) return setPwdMsg({ tone: "error", text: t.auth.signup.mismatch });
            setPwdLoading(true);
            const { error } = await createClient().auth.updateUser({ password: pwd });
            setPwdLoading(false);
            if (error) return setPwdMsg({ tone: "error", text: t.common.genericError });
            setPwd("");
            setPwd2("");
            setPwdMsg({ tone: "success", text: s.security.updated });
          }}
        >
          <div>
            <label htmlFor="set-pwd" className="label">{t.auth.signup.newPassword}</label>
            <PasswordInput id="set-pwd" value={pwd} onChange={setPwd} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="set-pwd2" className="label">{t.auth.signup.confirmPassword}</label>
            <PasswordInput id="set-pwd2" value={pwd2} onChange={setPwd2} autoComplete="new-password" />
          </div>
          {pwdMsg && <Alert tone={pwdMsg.tone}>{pwdMsg.text}</Alert>}
          <button type="submit" disabled={pwdLoading} className="btn btn-primary btn-md">
            {pwdLoading && <Spinner />}
            {s.security.update}
          </button>
        </form>
      </Section>

      <Section title={s.sessions.title} sub={s.sessions.sub}>
        <form action="/auth/signout?scope=global" method="post">
          <button type="submit" className="btn btn-ghost btn-md">{s.sessions.action}</button>
        </form>
      </Section>

      <Section title={s.danger.title} sub={s.danger.sub} danger>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setDeleteError(false);
            startDelete(async () => {
              const res = await deleteAccount(confirm, s.danger.word);
              if (res && !res.ok) setDeleteError(true);
            });
          }}
        >
          <div>
            <label htmlFor="confirm-delete" className="label">
              {fmt(s.danger.confirmLabel, { word: s.danger.word })}
            </label>
            <input id="confirm-delete" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          {deleteError && <Alert>{t.common.genericError}</Alert>}
          <button type="submit" disabled={confirm.trim() !== s.danger.word || deleting} className="btn btn-danger btn-md">
            {deleting && <Spinner />}
            {s.danger.action}
          </button>
        </form>
      </Section>
    </div>
  );
}
