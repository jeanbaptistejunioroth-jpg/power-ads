"use client";

import { Check } from "lucide-react";

/** Groupe de puces à choix multiple (aria-pressed) ou unique (radio). */
export function ChipGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T[] | T;
  onChange: (next: T[] | T) => void;
  multiple?: boolean;
}) {
  const selected = Array.isArray(value) ? value : [value];
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <fieldset>
      <legend className="label" id={id}>
        {label}
      </legend>
      {hint && <p className="-mt-1 mb-3 text-sm text-ink-3">{hint}</p>}
      <div className="flex flex-wrap gap-2" role={multiple ? "group" : "radiogroup"} aria-labelledby={id}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className="chip"
              role={multiple ? undefined : "radio"}
              aria-pressed={multiple ? on : undefined}
              aria-checked={multiple ? undefined : on}
              onClick={() => {
                if (!multiple) return onChange(o.value);
                onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
              }}
            >
              {multiple && on && <Check size={15} strokeWidth={2.5} aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** En-tête d'étape. */
export function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-1.5 text-ink-2">{sub}</p>
    </div>
  );
}

/** Petite icône de format d'image (9:16, 1:1, 16:9). */
export function RatioGlyph({ ratio }: { ratio: string }) {
  const size = ratio === "9:16" ? "h-7 w-4" : ratio === "1:1" ? "h-6 w-6" : "h-4 w-7";
  return <span className={`inline-block rounded-[4px] border-2 border-current ${size}`} aria-hidden />;
}
