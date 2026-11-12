import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { LEGAL_UPDATED, legalDoc } from "@/lib/legal-content";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getDictionary();
  return { title: legalDoc(slug, locale)?.doc.title };
}

export default async function LegalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { t, locale } = await getDictionary();
  const legal = legalDoc(slug, locale);
  if (!legal) notFound();
  const { doc, lang } = legal;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(LEGAL_UPDATED));

  return (
    <>
      <SiteHeader signedIn={!!user} />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text">
          <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden /> {t.legal.backHome}
        </Link>
        {lang !== locale && <p className="mt-6 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-text">{t.legal.englishOnly}</p>}
        <h1 lang={lang} dir="ltr" className="mt-6 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-ink-3">{fmt(t.legal.lastUpdated, { date })}</p>
        <div lang={lang} dir="ltr" className="mt-12 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.h}>
              <h2 className="text-xl font-medium">{section.h}</h2>
              <div className="mt-3 space-y-3 leading-[1.75] text-ink-2">
                {section.p.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
