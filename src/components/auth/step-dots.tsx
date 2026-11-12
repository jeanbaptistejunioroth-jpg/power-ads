export function StepDots({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-10 flex items-center gap-3 text-xs font-medium text-ink-3">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-3">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
              i < current
                ? "bg-brand text-on-brand"
                : i === current
                  ? "border border-brand text-brand-text"
                  : "border border-line"
            }`}
            aria-current={i === current ? "step" : undefined}
          >
            {i + 1}
          </span>
          <span className={i === current ? "text-ink" : ""}>{label}</span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-line sm:w-10" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
