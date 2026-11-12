"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/lib/i18n/provider";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/#how", label: t.nav.how },
    { href: "/#pricing", label: t.nav.pricing },
    { href: "/#faq", label: t.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-2 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm ms-1">
              {t.common.dashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm px-3 text-ink-2 hover:text-ink">
                {t.common.signIn}
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                {t.common.signUp}
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev lg:hidden"
          aria-label={open ? t.common.close : t.common.menu}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-bg px-5 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3.5 text-base font-medium"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="mt-5 grid gap-3">
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                {t.common.dashboard}
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-primary btn-lg">
                  {t.common.signUp}
                </Link>
                <Link href="/login" className="btn btn-ghost btn-lg">
                  {t.common.signIn}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
