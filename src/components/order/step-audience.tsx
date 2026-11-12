"use client";

import { useI18n } from "@/lib/i18n/provider";
import { LOCALE_NAMES } from "@/lib/i18n/config";
import { AGE_RANGES, APPEARANCES, GENDERS, REGIONS, TONES, VOICE_LANGUAGES } from "@/lib/order";
import { ChipGroup, StepHeader } from "./ui";
import type { Draft, SetDraft } from "./types";

export function StepAudience({ draft, set }: { draft: Draft; set: SetDraft }) {
  const { t } = useI18n();
  const a = t.app.order.audience;
  const o = a.options;
  const setAudience = (patch: Partial<Draft["audience"]>) =>
    set((d) => ({ audience: { ...d.audience, ...patch }, scripts: d.scriptMode === "ai" ? [] : d.scripts, confirmed: false }));

  return (
    <div>
      <StepHeader title={a.title} sub={a.sub} />
      <div className="space-y-8">
        <ChipGroup
          label={a.regions}
          multiple
          options={REGIONS.map((v) => ({ value: v, label: o.regions[v] }))}
          value={draft.audience.regions}
          onChange={(v) => setAudience({ regions: v as Draft["audience"]["regions"] })}
        />
        <ChipGroup
          label={a.gender}
          options={GENDERS.map((v) => ({ value: v, label: o.gender[v] }))}
          value={draft.audience.gender}
          onChange={(v) => setAudience({ gender: v as Draft["audience"]["gender"] })}
        />
        <ChipGroup
          label={a.ages}
          multiple
          options={AGE_RANGES.map((v) => ({ value: v, label: v }))}
          value={draft.audience.ages}
          onChange={(v) => setAudience({ ages: v as Draft["audience"]["ages"] })}
        />
        <ChipGroup
          label={a.appearances}
          hint={a.appearancesHint}
          multiple
          options={APPEARANCES.map((v) => ({ value: v, label: o.appearances[v] }))}
          value={draft.audience.appearances}
          onChange={(v) => setAudience({ appearances: v as Draft["audience"]["appearances"] })}
        />
        <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
          <ChipGroup
            label={a.language}
            options={VOICE_LANGUAGES.map((v) => ({ value: v, label: LOCALE_NAMES[v] }))}
            value={draft.language}
            onChange={(v) => set((d) => ({ language: v as Draft["language"], scripts: d.scriptMode === "ai" ? [] : d.scripts, confirmed: false }))}
          />
          <ChipGroup
            label={a.tone}
            options={TONES.map((v) => ({ value: v, label: o.tone[v] }))}
            value={draft.audience.tone}
            onChange={(v) => setAudience({ tone: v as Draft["audience"]["tone"] })}
          />
        </div>
        <div>
          <label htmlFor="style" className="label">
            {a.style} <span className="font-normal text-ink-3">({t.common.optional})</span>
          </label>
          <textarea
            id="style"
            className="field min-h-[5.5rem]"
            maxLength={600}
            placeholder={a.stylePlaceholder}
            value={draft.style}
            onChange={(e) => set({ style: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
