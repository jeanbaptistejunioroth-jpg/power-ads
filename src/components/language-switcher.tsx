"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t.common.language}</span>
      <Globe size={16} className="pointer-events-none absolute start-3 text-ink-3" aria-hidden />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          setLocaleCookie(e.target.value as Locale);
          start(() => router.refresh());
        }}
        className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-elev ps-9 pe-4 text-sm font-medium text-ink-2 hover:text-ink"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
