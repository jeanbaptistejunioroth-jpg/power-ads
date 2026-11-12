"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImageIcon, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { normalizePhone } from "@/lib/order";
import type { TokenGrid } from "@/lib/order";
import { Alert, Spinner } from "@/components/auth/parts";
import { StepProduct } from "./step-product";
import { StepAudience } from "./step-audience";
import { StepFormat } from "./step-format";
import { StepScript } from "./step-script";
import { StepHeader } from "./ui";
import { emptyDraft, type Draft, type SetDraft } from "./types";

const PHONE_RE = /^\+[1-9][0-9]{6,14}$/;

export function OrderWizard({
  userId,
  balance,
  whatsapp,
  pricing,
}: {
  userId: string;
  balance: number;
  whatsapp: string;
  pricing: TokenGrid;
}) {
  const { t, locale } = useI18n();
  const o = t.app.order;
  const router = useRouter();
  const storageKey = `pa_order_draft_v1_${userId}`;
  const [draft, setDraftState] = useState<Draft>(() => emptyDraft(locale, whatsapp));
  const [loaded, setLoaded] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Brouillon conservé dans le navigateur : un rechargement ne fait rien perdre.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDraftState((d) => ({ ...d, ...(JSON.parse(raw) as Partial<Draft>) }));
    } catch {
      /* stockage indisponible : on repart d'un brouillon vide */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* ignoré */
    }
  }, [draft, loaded, storageKey]);

  const set: SetDraft = useCallback((patch) => {
    setStepError(null);
    setDraftState((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  }, []);

  // Prix selon le style ET la durée : exactement ce que la base débitera (place_order_for).
  const unit = pricing[draft.videoStyle][draft.duration];
  const total = unit * draft.count;
  const missingTokens = Math.max(0, total - balance);
  const nf = new Intl.NumberFormat(locale);

  const stepValid = useMemo(
    () => [
      draft.product.name.trim().length >= 2 && draft.product.description.trim().length >= 20 && draft.product.images.length > 0,
      draft.audience.regions.length > 0 && draft.audience.ages.length > 0 && draft.audience.appearances.length > 0,
      true,
      draft.scripts.length >= draft.count &&
        draft.scripts.slice(0, draft.count).every((x) => x.trim().length >= 20) &&
        draft.confirmed,
    ],
    [draft],
  );
  const stepMissing = [o.product.missing, o.audience.missing, "", o.script.missing];

  function goTo(step: number) {
    setStepError(null);
    set((d) => ({ step, maxStep: Math.max(d.maxStep, step) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    if (!stepValid[draft.step]) return setStepError(stepMissing[draft.step]);
    goTo(draft.step + 1);
  }

  function reset() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignoré */
    }
    setDraftState(emptyDraft(locale, whatsapp));
    setSubmitError(null);
    setStepError(null);
  }

  const phone = normalizePhone(draft.whatsapp);
  const phoneValid = !phone || PHONE_RE.test(phone);

  async function submit() {
    const firstInvalid = stepValid.findIndex((v) => !v);
    if (firstInvalid >= 0) {
      goTo(firstInvalid);
      setStepError(stepMissing[firstInvalid]);
      return;
    }
    if (!phoneValid || missingTokens > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: draft.product,
          audience: draft.audience,
          language: draft.language,
          style: draft.style,
          duration_s: draft.duration,
          aspect_ratio: draft.ratio,
          video_style: draft.videoStyle,
          script_mode: draft.scriptMode,
          scripts: draft.scripts.slice(0, draft.count),
          whatsapp: phone,
          scripts_confirmed: draft.confirmed,
          // Total affiché : le serveur refuse la commande si le prix a changé entre-temps.
          quoted_tokens: total,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setSubmitError(o.review.errors[data.error as keyof typeof o.review.errors] ?? o.review.errors.order_failed);
        setSubmitting(false);
        return;
      }
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignoré */
      }
      router.push(`/videos/${data.id}?new=1`);
      router.refresh();
    } catch {
      setSubmitError(o.review.errors.order_failed);
      setSubmitting(false);
    }
  }

  const aud = o.audience.options;
  const audienceSummary = [
    ...draft.audience.regions.map((r) => aud.regions[r]),
    draft.audience.gender !== "mixed" ? aud.gender[draft.audience.gender] : null,
    ...draft.audience.ages,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{o.title}</h1>
          <p className="page-sub">{o.sub}</p>
        </div>
        {loaded && draft.maxStep > 0 && (
          <button type="button" onClick={reset} className="btn btn-sm text-ink-2 hover:text-ink">
            <RotateCcw size={15} aria-hidden /> {o.reset}
          </button>
        )}
      </div>

      {/* Étapes */}
      <ol className="mt-8 flex gap-1.5 overflow-x-auto pb-1" aria-label={o.title}>
        {o.steps.map((label, i) => {
          const done = i < draft.step;
          const current = i === draft.step;
          const reachable = i <= draft.maxStep;
          return (
            <li key={label} className="min-w-[60px] flex-1">
              <button
                type="button"
                disabled={!reachable || submitting}
                onClick={() => goTo(i)}
                aria-current={current ? "step" : undefined}
                className="group w-full text-start disabled:cursor-default"
              >
                <span className={`block h-1 rounded-full ${done || current ? "bg-brand" : "bg-line"}`} />
                <span
                  className={`mt-2.5 flex items-center gap-1.5 text-xs font-medium sm:text-sm ${
                    current ? "text-ink" : reachable ? "text-ink-2 group-hover:text-ink" : "text-ink-3"
                  }`}
                >
                  {done && <Check size={14} strokeWidth={2.5} className="hidden text-brand-text sm:block" aria-hidden />}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card p-5 sm:p-8">
          {!loaded ? (
            <div className="flex h-64 items-center justify-center text-ink-3">
              <Spinner />
            </div>
          ) : (
            <>
              {draft.step === 0 && <StepProduct draft={draft} set={set} userId={userId} />}
              {draft.step === 1 && <StepAudience draft={draft} set={set} />}
              {draft.step === 2 && <StepFormat draft={draft} set={set} pricing={pricing} />}
              {draft.step === 3 && <StepScript draft={draft} set={set} />}
              {draft.step === 4 && (
                <Review
                  draft={draft}
                  set={set}
                  unit={unit}
                  total={total}
                  balance={balance}
                  missingTokens={missingTokens}
                  phoneValid={phoneValid}
                />
              )}

              {stepError && <div className="mt-6"><Alert>{stepError}</Alert></div>}
              {submitError && <div className="mt-6"><Alert>{submitError}</Alert></div>}

              <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
                {draft.step > 0 ? (
                  <button type="button" onClick={() => goTo(draft.step - 1)} disabled={submitting} className="btn btn-ghost btn-md">
                    <ArrowLeft size={17} className="rtl:-scale-x-100" aria-hidden /> {o.back}
                  </button>
                ) : (
                  <span />
                )}
                {draft.step < 4 ? (
                  <button type="button" onClick={next} className="btn btn-primary btn-md">
                    {o.next} <ArrowRight size={17} className="rtl:-scale-x-100" aria-hidden />
                  </button>
                ) : missingTokens > 0 ? (
                  <Link href="/billing" className="btn btn-primary btn-md">
                    {o.review.topUp}
                  </Link>
                ) : (
                  <button type="button" onClick={submit} disabled={submitting || !phoneValid} className="btn btn-primary btn-md">
                    {submitting && <Spinner />}
                    {submitting ? o.review.submitting : fmt(o.review.submit, { n: nf.format(total) })}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Récapitulatif (ordinateur) */}
        <aside className="card sticky top-8 hidden overflow-hidden lg:block" aria-label={o.summary}>
          {draft.product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.product.images[0]} alt="" className="aspect-[4/3] w-full border-b border-line object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-line bg-sunken text-ink-3">
              <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
            </div>
          )}
          <dl className="space-y-4 p-5 text-sm">
            <div>
              <dt className="text-ink-3">{o.steps[0]}</dt>
              <dd className="mt-0.5 truncate font-medium">{draft.product.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">{o.steps[1]}</dt>
              <dd className="mt-0.5 font-medium">{audienceSummary || "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">{o.steps[2]}</dt>
              <dd className="mt-0.5 font-medium">
                {fmt(t.app.videos.summary, { count: draft.count, duration: draft.duration, ratio: draft.ratio })}
              </dd>
              <dd className="mt-0.5 text-ink-2">{o.format.styles[draft.videoStyle].name}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <dt className="text-ink-3">{o.review.total}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {nf.format(total)} <span className="text-sm font-normal text-ink-2">{t.common.tokens}</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-ink-3">{o.review.balance}</dt>
              <dd className={`tabular-nums ${missingTokens > 0 ? "font-semibold text-danger" : "text-ink-2"}`}>{nf.format(balance)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Review({
  draft,
  set,
  unit,
  total,
  balance,
  missingTokens,
  phoneValid,
}: {
  draft: Draft;
  set: SetDraft;
  unit: number;
  total: number;
  balance: number;
  missingTokens: number;
  phoneValid: boolean;
}) {
  const { t, locale } = useI18n();
  const r = t.app.order.review;
  const nf = new Intl.NumberFormat(locale);

  return (
    <div>
      <StepHeader title={r.title} sub={r.sub} />

      <div className="flex gap-4 rounded-2xl border border-line p-4">
        {draft.product.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.product.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{draft.product.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{draft.product.description}</p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-ink-2">{fmt(r.lineVideos, { count: draft.count, duration: draft.duration })}</dt>
          <dd className="tabular-nums text-ink-2">{fmt(r.unit, { n: nf.format(unit) })}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="font-semibold">{r.total}</dt>
          <dd className="text-base font-semibold tabular-nums">
            {nf.format(total)} {t.common.tokens}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-ink-2">{r.balance}</dt>
          <dd className="tabular-nums text-ink-2">{nf.format(balance)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-ink-2">{r.after}</dt>
          <dd className={`tabular-nums ${missingTokens > 0 ? "font-semibold text-danger" : "font-medium"}`}>
            {nf.format(balance - total)}
          </dd>
        </div>
      </dl>

      {missingTokens > 0 && (
        <div className="mt-4">
          <Alert>{fmt(r.insufficient, { n: nf.format(missingTokens) })}</Alert>
        </div>
      )}

      <div className="mt-8">
        <label htmlFor="wa" className="label">{r.whatsapp}</label>
        <input
          id="wa"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="field"
          placeholder={r.whatsappPlaceholder}
          value={draft.whatsapp}
          onChange={(e) => set({ whatsapp: e.target.value })}
          aria-invalid={!phoneValid}
        />
        {phoneValid ? <p className="hint">{r.whatsappHint}</p> : <p className="mt-2 text-sm text-danger">{r.whatsappInvalid}</p>}
      </div>
    </div>
  );
}
