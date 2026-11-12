import { Check, ImageIcon, Plus, ShoppingBag, Target, User } from "lucide-react";
import { GoogleDriveIcon, WhatsAppIcon } from "@/components/brand-icons";
import { LoopVideo } from "@/components/loop-video";

// ─────────────────────────────────────────────────────────────
// Éléments décoratifs (fonds, illustrations, petites animations).
// Purement visuels : aria-hidden, aucun texte traduit, couleurs de la palette
// (variables CSS), animations coupées si l'appareil demande moins de mouvement.
// ─────────────────────────────────────────────────────────────

type Cls = { className?: string };

/** Halo lumineux flou (placer dans un parent relative/overflow-hidden). */
export function GlowOrb({ className = "", tone = "brand" }: Cls & { tone?: "brand" | "accent" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl ${tone === "brand" ? "bg-brand/20" : "bg-panel-accent/25"} ${className}`}
    />
  );
}

/** Trame de points qui s'estompe vers les bords. */
export function DotGrid({ className = "", tone = "line" }: Cls & { tone?: "line" | "panel" }) {
  return <span aria-hidden className={`decor-dots pointer-events-none absolute ${tone === "panel" ? "decor-dots-panel" : ""} ${className}`} />;
}

/** Bouton lecture, avec une onde qui pulse. */
export function PlayButton({ className = "", tone = "brand", pulse = true }: Cls & { tone?: "brand" | "white"; pulse?: boolean }) {
  const disc = tone === "brand" ? "bg-brand" : "bg-white";
  const tri = tone === "brand" ? "fill-white" : "fill-panel";
  return (
    <span aria-hidden className={`pointer-events-none relative inline-flex shrink-0 items-center justify-center ${className}`}>
      {pulse && <span className={`anim-pulse-ring absolute inset-0 rounded-full ${disc}`} />}
      <span className={`relative inline-flex h-full w-full items-center justify-center rounded-full shadow-[0_10px_30px_-10px_rgba(12,42,110,0.55)] ${disc}`}>
        <svg viewBox="0 0 24 24" className={`h-[42%] w-[42%] translate-x-[8%] ${tri}`}>
          <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
      </span>
    </span>
  );
}

/** Onde sonore animée (voix off). */
export function Waveform({ className = "", bars = 14 }: Cls & { bars?: number }) {
  const heights = [40, 70, 55, 90, 65, 100, 45, 80, 60, 95, 50, 75, 35, 85, 55, 70];
  return (
    <span aria-hidden className={`anim-eq pointer-events-none inline-flex items-end gap-[3px] ${className}`}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{ height: `${heights[i % heights.length]}%`, animationDelay: `${-(i * 0.13).toFixed(2)}s` }}
        />
      ))}
    </span>
  );
}

/** Petite étoile scintillante. */
export function Sparkle({ className = "" }: Cls) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`anim-twinkle pointer-events-none ${className}`} fill="currentColor">
      <path d="M12 0c.6 5.6 2.3 8.6 6 10.2L24 12l-6 1.8c-3.7 1.6-5.4 4.6-6 10.2-.6-5.6-2.3-8.6-6-10.2L0 12l6-1.8C9.7 8.6 11.4 5.6 12 0Z" />
    </svg>
  );
}

/** Pellicule de film (bande horizontale). */
export function FilmStrip({ className = "", frames = 7 }: Cls & { frames?: number }) {
  const w = frames * 64 + 8;
  return (
    <svg aria-hidden viewBox={`0 0 ${w} 72`} className={`pointer-events-none ${className}`} fill="none">
      <rect x="0" y="0" width={w} height="72" rx="8" fill="currentColor" opacity="0.18" />
      {Array.from({ length: frames }, (_, i) => (
        <g key={i}>
          <rect x={8 + i * 64} y="16" width="56" height="40" rx="4" fill="currentColor" opacity="0.28" />
          <path d={`M${30 + i * 64} 29v14l11-7z`} fill="currentColor" opacity="0.55" />
          {[0, 1, 2, 3].map((h) => (
            <g key={h}>
              <rect x={12 + i * 64 + h * 14} y="4" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.45" />
              <rect x={12 + i * 64 + h * 14} y="62" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.45" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Cercles concentriques (fonds des panneaux bleu nuit). */
export function Rings({ className = "" }: Cls) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={`pointer-events-none ${className}`} fill="none" stroke="currentColor">
      {[60, 110, 160, 210].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} strokeWidth="1.2" opacity={0.5 - i * 0.1} strokeDasharray={i % 2 ? "4 8" : undefined} />
      ))}
    </svg>
  );
}

/** Pile de pièces (tokens). */
export function CoinStack({ className = "", count = 3 }: Cls & { count?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={`pointer-events-none ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      {Array.from({ length: Math.min(3, Math.max(1, count)) }, (_, i) => {
        const y = 34 - i * 7;
        return (
          <g key={i} opacity={0.45 + i * 0.25}>
            <ellipse cx="24" cy={y} rx="14" ry="5" className="fill-elev" />
            <path d={`M10 ${y} v-4 a14 5 0 0 0 28 0 v4`} className="fill-brand-soft" />
            <ellipse cx="24" cy={y - 4} rx="14" ry="5" className="fill-brand-soft" />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Téléphone qui lit en boucle une publicité verticale (muette, non interactive).
 * `slot` : numéro d'emplacement sur la page, pour répartir des vidéos différentes.
 */
export function PhoneVideo({ className = "", slot = 0 }: Cls & { slot?: number }) {
  return (
    <div aria-hidden className={`pointer-events-none select-none ${className}`}>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.6rem] border-[5px] border-panel bg-panel shadow-[0_30px_60px_-30px_rgba(12,42,110,0.6)] ring-1 ring-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,var(--panel-accent),transparent_58%),linear-gradient(165deg,var(--brand),var(--panel)_78%)]" />
        <LoopVideo slot={slot} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full bg-white/70" />
          <span className="h-1.5 w-10 rounded-full bg-white/60" />
        </div>
        <div className="absolute end-2.5 top-[45%] flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-4 w-4 rounded-full bg-white/40 shadow-sm" />
          ))}
        </div>
        <div className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/30">
          <span className="anim-progress block h-full w-full rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}

/** Vignette de vidéo livrée : la publicité joue en boucle, muette. */
export function VideoThumb({ className = "", hue = 0, label, slot = 0 }: Cls & { hue?: 0 | 1 | 2 | 3; label?: string; slot?: number }) {
  const bg = [
    "bg-[linear-gradient(160deg,var(--brand),var(--panel))]",
    "bg-[linear-gradient(160deg,var(--panel-accent),var(--brand))]",
    "bg-[linear-gradient(160deg,var(--panel),var(--brand)_90%)]",
    "bg-[linear-gradient(200deg,var(--brand),var(--panel-accent))]",
  ][hue];
  return (
    <span aria-hidden className={`relative block aspect-[9/16] overflow-hidden rounded-xl ${bg} ${className}`}>
      <LoopVideo slot={slot} className="absolute inset-0 h-full w-full" />
      {label && (
        <span className="absolute bottom-1.5 end-1.5 rounded-md bg-black/45 px-1 py-px text-[9px] font-semibold tabular-nums text-white">
          {label}
        </span>
      )}
    </span>
  );
}

/** Illustrations des 3 étapes « Comment ça marche ». */
export function StepArt({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div aria-hidden className="relative isolate h-36 overflow-hidden rounded-2xl border border-line bg-sunken">
      <DotGrid className="inset-0 -z-10 opacity-70" />
      {step === 0 && (
        <>
          <div className="anim-float absolute start-[14%] top-5 w-36 rounded-xl border border-line bg-elev p-2.5 shadow-sm">
            <span className="flex h-12 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
              <ImageIcon size={20} />
            </span>
            <span className="mt-2 block h-1.5 w-4/5 rounded-full bg-line-strong" />
            <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-line" />
          </div>
          <span className="anim-float-delay absolute end-[16%] top-8 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lg">
            <ShoppingBag size={20} />
          </span>
          <span className="anim-float-slow absolute bottom-4 end-[30%] inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-elev text-brand-text">
            <Plus size={16} />
          </span>
          <Sparkle className="absolute end-[10%] bottom-6 h-3.5 w-3.5 text-brand-text" />
        </>
      )}
      {step === 1 && (
        <>
          <span className="absolute start-1/2 top-1/2 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-on-brand rtl:translate-x-1/2">
            <span className="anim-pulse-ring absolute inset-0 rounded-full bg-brand" />
            <Target size={26} className="relative" />
          </span>
          {[
            "start-[14%] top-5",
            "end-[14%] top-7",
            "start-[22%] bottom-4",
            "end-[24%] bottom-5",
          ].map((pos, i) => (
            <span
              key={pos}
              className={`${i % 2 ? "anim-float" : "anim-float-delay"} absolute ${pos} inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-elev bg-brand-soft text-brand-text shadow-sm`}
            >
              <User size={16} />
            </span>
          ))}
          <Sparkle className="absolute start-[45%] top-3 h-3 w-3 text-brand-text" />
        </>
      )}
      {step === 2 && (
        <>
          <PhoneVideo slot={5} className="anim-float absolute start-[18%] top-3 w-[4.4rem] -rotate-6" />
          <span className="anim-float-delay absolute end-[16%] top-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-elev shadow-sm">
            <GoogleDriveIcon className="h-6 w-6" />
          </span>
          <span className="anim-float-slow absolute bottom-5 end-[30%] inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev shadow-sm">
            <WhatsAppIcon className="h-5 w-5" />
          </span>
          <span className="absolute bottom-4 start-[46%] inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
            <Check size={14} strokeWidth={3} />
          </span>
        </>
      )}
    </div>
  );
}
