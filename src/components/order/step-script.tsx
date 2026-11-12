"use client";

import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { WORDS_PER_SECOND, wordCount, wordRange } from "@/lib/order";
import { Alert, Spinner } from "@/components/auth/parts";
import { StepHeader } from "./ui";
import type { Draft, SetDraft } from "./types";

export function StepScript({ draft, set }: { draft: Draft; set: SetDraft }) {
  const { t } = useI18n();
  const s = t.app.order.script;
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const range = wordRange(draft.duration, draft.language);

  async function request(count: number, avoid: string[]) {
    const res = await fetch("/api/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          name: draft.product.name,
          description: draft.product.description,
          price: draft.product.price || undefined,
          url: draft.product.url || undefined,
        },
        audience: draft.audience,
        video_style: draft.videoStyle,
        language: draft.language,
        duration: draft.duration,
        count,
        style: draft.style || undefined,
        avoid: avoid.length ? avoid : undefined,
      }),
    });
    const data = (await res.json()) as { scripts?: string[]; simulated?: boolean; error?: string };
    if (!res.ok || !data.scripts) throw new Error(data.error ?? "generation_failed");
    return { scripts: data.scripts, simulated: !!data.simulated };
  }

  function showError(code: string) {
    setError(s.errors[code as keyof typeof s.errors] ?? s.errors.generation_failed);
  }

  /** Rédige les scripts manquants (tous au premier passage). */
  async function generateMissing() {
    const existing = draft.scripts.filter((x) => x.trim().length >= 20);
    const missing = draft.count - existing.length;
    if (missing <= 0) return;
    setBusy("all");
    setError(null);
    try {
      const { scripts, simulated } = await request(missing, existing);
      set({ scripts: [...existing, ...scripts].slice(0, draft.count), simulated, confirmed: false });
    } catch (e) {
      showError(e instanceof Error ? e.message : "generation_failed");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(index: number) {
    setBusy(index);
    setError(null);
    try {
      const { scripts, simulated } = await request(1, draft.scripts);
      set((d) => {
        const next = [...d.scripts];
        next[index] = scripts[0];
        return { scripts: next, simulated, confirmed: false };
      });
    } catch (e) {
      showError(e instanceof Error ? e.message : "generation_failed");
    } finally {
      setBusy(null);
    }
  }

  const editScript = (index: number, value: string) =>
    set((d) => {
      const next = Array.from({ length: d.count }, (_, i) => d.scripts[i] ?? "");
      next[index] = value;
      return { scripts: next, confirmed: false };
    });

  const filled = draft.scripts.filter((x) => x.trim().length >= 20).length;
  const showEditors = draft.scriptMode === "client" || filled > 0;
  const editors = Array.from({ length: draft.count }, (_, i) => i).filter(
    (i) => draft.scriptMode === "client" || (draft.scripts[i] ?? "").trim().length > 0,
  );

  return (
    <div>
      <StepHeader title={s.title} sub={s.sub} />

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
        {(["ai", "client"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={draft.scriptMode === mode}
            onClick={() => set({ scriptMode: mode, confirmed: false })}
            className="choice p-5"
          >
            <span className="flex items-center gap-3">
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  draft.scriptMode === mode ? "border-brand" : "border-line-strong"
                }`}
                aria-hidden
              >
                {draft.scriptMode === mode && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
              </span>
              <span className="font-semibold">{mode === "ai" ? s.modeAi : s.modeClient}</span>
            </span>
            <span className="mt-2 block ps-8 text-sm leading-relaxed text-ink-2">{mode === "ai" ? s.modeAiBody : s.modeClientBody}</span>
          </button>
        ))}
      </div>

      {draft.scriptMode === "ai" && filled < draft.count && (
        <button type="button" onClick={generateMissing} disabled={busy !== null} className="btn btn-primary btn-lg mt-6 w-full sm:w-auto">
          {busy === "all" && <Spinner />}
          {busy === "all" ? s.generating : s.generate}
        </button>
      )}

      {error && <div className="mt-5"><Alert>{error}</Alert></div>}
      {draft.scriptMode === "ai" && draft.simulated && filled > 0 && (
        <div className="mt-5"><Alert tone="info">{s.simulated}</Alert></div>
      )}

      {showEditors && (
        <ol className="mt-6 space-y-4">
          {editors.map((i) => {
            const value = draft.scripts[i] ?? "";
            const words = wordCount(value);
            const secs = Math.round(words / WORDS_PER_SECOND[draft.language]);
            const status = !words ? null : words < range.min ? "short" : words > range.max ? "long" : "ok";
            return (
              <li key={i} className="card p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={`script-${i}`} className="text-sm font-semibold">
                    {fmt(s.videoLabel, { n: i + 1 })}
                  </label>
                  <div className="flex items-center gap-1">
                    {draft.scriptMode === "client" && i === 0 && draft.count > 1 && value.trim().length >= 20 && (
                      <button
                        type="button"
                        onClick={() => set({ scripts: Array.from({ length: draft.count }, () => value), confirmed: false })}
                        className="btn btn-sm text-ink-2 hover:text-ink"
                      >
                        <Copy size={15} aria-hidden /> {s.copyToAll}
                      </button>
                    )}
                    {draft.scriptMode === "ai" && (
                      <button
                        type="button"
                        onClick={() => regenerate(i)}
                        disabled={busy !== null}
                        className="btn btn-sm text-ink-2 hover:text-ink"
                      >
                        {busy === i ? <Spinner /> : <RefreshCw size={15} aria-hidden />} {s.regenerate}
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  id={`script-${i}`}
                  className="field min-h-[8.5rem]"
                  maxLength={4000}
                  placeholder={s.placeholder}
                  value={value}
                  onChange={(e) => editScript(i, e.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="tabular-nums text-ink-3">{fmt(s.words, { n: words, s: secs })}</span>
                  {status === "short" && (
                    <span className="text-ink-2">{fmt(s.tooShort, { d: draft.duration, min: range.min, max: range.max })}</span>
                  )}
                  {status === "long" && (
                    <span className="font-medium text-danger">{fmt(s.tooLong, { d: draft.duration, min: range.min, max: range.max })}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {filled === draft.count && (
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-elev p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
            checked={draft.confirmed}
            onChange={(e) => set({ confirmed: e.target.checked })}
          />
          <span className="text-sm leading-relaxed">{s.confirm}</span>
        </label>
      )}
    </div>
  );
}
