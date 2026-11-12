import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GoogleDriveIcon, ShopifyIcon, WhatsAppIcon } from "@/components/brand-icons";
import { DotGrid, FilmStrip, GlowOrb, PhoneVideo, PlayButton, Rings, Sparkle, Waveform } from "@/components/decor";
import { getDictionary } from "@/lib/i18n/server";

type Variant = "login" | "signup" | "reset";

export async function AuthShell({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const { t } = await getDictionary();
  const copy = t.auth[variant];
  const n = t.auth.notification;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ── Panneau gauche (desktop) ─────────────────────────────── */}
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-panel p-12 text-panel-ink lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <DotGrid tone="panel" className="inset-0" />
          <GlowOrb tone="accent" className="-top-24 end-[-6rem] h-80 w-80" />
          <Rings className="anim-spin-slow absolute -bottom-40 -end-40 h-[30rem] w-[30rem] text-panel-accent opacity-30" />
          <FilmStrip className="absolute bottom-28 end-[-5rem] w-[26rem] rotate-[-8deg] text-panel-accent opacity-25" />
          <Sparkle className="absolute end-[18%] top-[18%] h-4 w-4 text-panel-accent" />
        </div>
        <Logo tone="panel" />

        <div className="max-w-[540px]">
          <h1 className="display text-[clamp(2.75rem,4.2vw,3.75rem)]">
            {copy.titleA} <em className="text-panel-ink-2">{copy.titleEm}</em> {copy.titleB}
          </h1>
          <p className="mt-6 max-w-[440px] text-lg leading-relaxed text-panel-ink-2">{copy.sub}</p>

          {/* Notification de livraison telle que le client la reçoit */}
          <div className="relative mt-12 max-w-[420px]">
          <PhoneVideo className="anim-float-slow absolute -end-36 -top-24 w-28 rotate-[8deg] xl:-end-44 xl:w-32" />
          <div className="relative rounded-2xl bg-white p-4 text-[#111b21] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2.5">
              <WhatsAppIcon className="h-5 w-5" />
              <p className="text-[13px] font-semibold">WhatsApp</p>
              <span className="ms-auto text-xs text-[#667781]">{n.time}</span>
            </div>
            <p className="mt-2.5 text-sm font-semibold">{n.sender}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-[#3b4a54]">{n.body}</p>
          </div>
          <div className="anim-float absolute -bottom-7 start-8 inline-flex items-center gap-2.5 rounded-full bg-white/[0.08] px-3 py-2 text-panel-accent ring-1 ring-white/10 backdrop-blur" aria-hidden>
            <PlayButton tone="white" pulse={false} className="h-6 w-6" />
            <Waveform className="h-4" bars={12} />
          </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-panel-ink-2">
          <span>{t.auth.worksWith}</span>
          <ul className="flex items-center gap-2">
            {[
              { name: "Shopify", Icon: ShopifyIcon },
              { name: "Google Drive", Icon: GoogleDriveIcon },
              { name: "WhatsApp", Icon: WhatsAppIcon },
            ].map(({ name, Icon }) => (
              <li key={name} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.08] ps-2.5 pe-3.5 text-panel-ink">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {name}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Colonne formulaire ──────────────────────────────────── */}
      <main className="relative isolate flex flex-col overflow-hidden bg-bg">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <GlowOrb className="-top-40 end-[-10rem] h-96 w-96 opacity-70" />
          <DotGrid className="inset-x-0 bottom-0 h-72 opacity-50" />
          <Sparkle className="absolute bottom-16 start-10 h-4 w-4 text-brand-text opacity-70" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <div className="lg:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-4 sm:px-8">
          <div className="w-full max-w-[460px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
