import Link from "next/link";
import { Logo } from "./logo";
import { getDictionary } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getDictionary();
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@vidsella.com";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-elev">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.footer.tagline}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t.footer.product}</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-2">
            <li><Link className="hover:text-ink" href="/#how">{t.nav.how}</Link></li>
            <li><Link className="hover:text-ink" href="/#pricing">{t.nav.pricing}</Link></li>
            <li><Link className="hover:text-ink" href="/#faq">{t.nav.faq}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t.footer.legal}</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-2">
            <li><Link className="hover:text-ink" href="/legal/mentions-legales">{t.footer.links.mentions}</Link></li>
            <li><Link className="hover:text-ink" href="/legal/cgv">{t.footer.links.terms}</Link></li>
            <li><Link className="hover:text-ink" href="/legal/confidentialite">{t.footer.links.privacy}</Link></li>
            <li><Link className="hover:text-ink" href="/legal/cookies">{t.footer.links.cookies}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t.footer.contact}</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-2">
            <li><a className="hover:text-ink" href={`mailto:${support}`}>{support}</a></li>
            <li><Link className="hover:text-ink" href="/support">{t.app.nav.support}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs text-ink-3 sm:px-8">
          © {year} VIDSELLA. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
