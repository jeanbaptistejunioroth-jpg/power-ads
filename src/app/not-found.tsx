import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { Logo } from "@/components/logo";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="display mt-10 text-5xl">{t.notFound.title}</h1>
      <p className="mt-4 text-ink-2">{t.notFound.body}</p>
      <Link href="/" className="btn btn-primary btn-md mt-8">{t.notFound.cta}</Link>
    </main>
  );
}
