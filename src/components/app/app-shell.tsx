"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, CreditCard, LayoutDashboard, LifeBuoy, LogOut, Plus, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { CoinStack, DotGrid, GlowOrb } from "@/components/decor";
import { Avatar } from "./avatar";

export function AppShell({
  children,
  name,
  email,
  balance,
  avatarUrl,
}: {
  children: React.ReactNode;
  name: string | null;
  email: string;
  balance: number;
  avatarUrl: string | null;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const nav = [
    { href: "/dashboard", label: t.app.nav.dashboard, icon: LayoutDashboard },
    { href: "/videos", label: t.app.nav.videos, icon: Clapperboard },
    { href: "/billing", label: t.app.nav.billing, icon: CreditCard },
    { href: "/support", label: t.app.nav.support, icon: LifeBuoy },
    { href: "/settings", label: t.app.nav.settings, icon: Settings },
  ];
  const isActive = (href: string) =>
    href === "/videos"
      ? pathname === "/videos" || (pathname.startsWith("/videos/") && pathname !== "/videos/new")
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      {/* Barre latérale (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-elev px-5 py-6 lg:flex">
        <Logo href="/dashboard" />
        <Link href="/videos/new" className="btn btn-primary btn-md mt-8 w-full">
          <Plus size={18} aria-hidden /> {t.app.nav.newVideo}
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive(href) ? "bg-brand-soft text-brand-text" : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/billing" className="relative isolate mt-8 overflow-hidden rounded-2xl border border-line p-4 hover:border-line-strong">
          <CoinStack count={2} className="absolute -bottom-2 end-1 -z-10 h-14 w-14 text-brand-text opacity-50" />
          <p className="text-xs font-medium text-ink-3">{t.app.dashboard.balance}</p>
          <p className="mt-1 text-2xl font-medium tabular-nums tracking-[-0.02em]">
            {new Intl.NumberFormat(locale).format(balance)}{" "}
            <span className="text-sm font-normal text-ink-2">{t.common.tokens}</span>
          </p>
        </Link>

        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 border-t border-line pt-4">
            <Link href="/settings" aria-label={t.app.nav.settings} className="shrink-0 rounded-full">
              <Avatar url={avatarUrl} label={name || email} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name || email}</p>
              <p className="truncate text-xs text-ink-3">{email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
                aria-label={t.common.signOut}
                title={t.common.signOut}
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Barre supérieure (mobile et tablette) */}
      <div className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <Link
              href="/videos/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-sm font-semibold text-on-brand"
            >
              <Plus size={17} aria-hidden /> <span className="hidden sm:inline">{t.app.nav.newVideo}</span>
            </Link>
            <ThemeToggle />
            <Link href="/settings" aria-label={t.app.nav.settings} className="rounded-full">
              <Avatar url={avatarUrl} label={name || email} className="h-10 w-10 text-sm" />
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev text-ink-2"
                aria-label={t.common.signOut}
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ${
                isActive(href) ? "bg-brand text-on-brand" : "text-ink-2 hover:text-ink"
              }`}
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="relative isolate min-w-0 overflow-x-clip px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96" aria-hidden>
          <GlowOrb className="-top-40 end-[-8rem] h-96 w-96 opacity-60" />
          <DotGrid className="inset-0 opacity-50" />
        </div>
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
