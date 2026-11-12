import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  return (
    <AppShell name={profile.full_name} email={user.email ?? ""} balance={profile.token_balance} avatarUrl={profile.avatar_url}>
      {children}
    </AppShell>
  );
}
