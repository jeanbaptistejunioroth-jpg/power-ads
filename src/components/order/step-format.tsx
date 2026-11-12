"use client";

import { Clapperboard, Minus, Plus, UserRound, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { ASPECT_RATIOS, DURATIONS, MAX_VIDEOS, VIDEO_STYLES, type Duration } from "@/lib/order";
import type { TokenGrid } from "@/lib/order";
import { RatioGlyph, StepHeader } from "./ui";
import type { Draft, SetDraft } from "./types";

const STYLE_ICONS = { mixed: Video, talking_head: UserRound, broll_voiceover: Clapperboard } as const;

export function StepFormat({ draft, set, pricing }: { draft: Draft; set: SetDraft; pricing: TokenGrid }) {
  const { t, locale } = useI18n();
  const f = t.app.order.format;
  const nf = new Intl.NumberFormat(locale);

  const setCount = (n: number) =>
    set((d) => ({
      count: n,
      scripts: d.scripts.slice(0, n),
      confirmed: false,
    }));

  return (
    <div>
      <StepHeader title={f.title} sub={f.sub} />
      <div className="space-y-9">
        <fieldset>
          <legend className="label">{f.style}</legend>
          <p className="hint -mt-1 mb-3">{f.styleHint}</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {VIDEO_STYLES.map((v) => {
              const Icon = STYLE_ICONS[v];
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={draft.videoStyle === v}
                  onClick={() => set({ videoStyle: v })}
                  className="choice flex flex-col items-start gap-3 p-4 text-start"
                >
                  <Icon size={20} strokeWidth={1.75} className="text-ink-2" aria-hidden />
                  <span>
                    <span className="block font-semibold">{f.styles[v].name}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-3">{f.styles[v].use}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <p className="label" id="count-label">{f.count}</p>
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center rounded-full border border-line bg-elev p-1" role="group" aria-labelledby="count-label">
              <button
                type="button"
                onClick={() => setCount(Math.max(1, draft.count - 1))}
                disabled={draft.count <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunken disabled:opacity-40"
                aria-label={f.decrease}
              >
                <Minus size={18} />
              </button>
              <output className="w-12 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                {draft.count}
              </output>
              <button
                type="button"
                onClick={() => setCount(Math.min(MAX_VIDEOS, draft.count + 1))}
                disabled={draft.count >= MAX_VIDEOS}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunken disabled:opacity-40"
                aria-label={f.increase}
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-sm text-ink-3">{f.countHint}</p>
          </div>
        </div>

        <fieldset>
          <legend className="label">{f.duration}</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={draft.duration === d}
                onClick={() => set({ duration: d as Duration, confirmed: false })}
                className="choice px-3 py-3.5 text-center"
              >
                <span className="block text-lg font-semibold tabular-nums">{fmt(t.common.seconds, { n: d })}</span>
                <span className="mt-0.5 block text-xs text-ink-3 tabular-nums">{fmt(f.perVideo, { n: nf.format(pricing[draft.videoStyle][d]) })}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">{f.ratio}</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={draft.ratio === r}
                onClick={() => set({ ratio: r })}
                className="choice flex items-center gap-4 px-4 py-4"
              >
                <span className="flex h-8 w-8 items-center justify-center text-ink-2">
                  <RatioGlyph ratio={r} />
                </span>
                <span>
                  <span className="block font-semibold">{f.ratios[r].name}</span>
                  <span className="block text-sm text-ink-3">{f.ratios[r].use}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
