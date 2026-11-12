import type { OrderStatus, VideoStatus } from "@/lib/order";

const TONE: Record<OrderStatus | VideoStatus, string> = {
  pending: "bg-sunken text-ink-2",
  sent: "bg-brand-soft text-brand-text",
  in_production: "bg-brand-soft text-brand-text",
  completed: "bg-success-soft text-success",
  delivered: "bg-success-soft text-success",
  partial: "bg-[color-mix(in_srgb,#d97706_14%,transparent)] text-[#b45309] dark:text-[#fbbf24]",
  failed: "bg-danger-soft text-danger",
};

const PULSE = new Set(["sent", "in_production"]);

/** Pastille de statut d'une commande ou d'une vidéo. */
export function StatusBadge({ status, label }: { status: OrderStatus | VideoStatus; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status]}`}>
      <span className="relative inline-flex h-1.5 w-1.5">
        {PULSE.has(status) && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}
