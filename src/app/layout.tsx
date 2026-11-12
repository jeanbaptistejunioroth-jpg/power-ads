import type { Metadata, Viewport } from "next";
import "./globals.css";
import { sans, serif } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: { default: t.meta.title, template: "%s — VIDSELLA" },
    description: t.meta.description,
    openGraph: { type: "website", siteName: "VIDSELLA", title: t.meta.title, description: t.meta.description },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#070c18" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t, dir } = await getDictionary();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh">
        <ThemeProvider>
          <I18nProvider locale={locale} t={t}>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
