import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.signup.heading };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  const { trial } = await searchParams;
  return (
    <AuthShell variant="signup">
      <SignupForm trial={trial === "1"} />
    </AuthShell>
  );
}
