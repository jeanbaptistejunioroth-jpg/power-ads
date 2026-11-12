import Link from "next/link";

export function LogoMark({
  className = "h-8 w-8",
  inner = "#ffffff",
}: {
  className?: string;
  inner?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path d="M12.5 9.5v13l10-6.5z" fill={inner} />
      <path d="M8 12v8" stroke={inner} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "brand" }: { href?: string; tone?: "brand" | "panel" }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 rounded-lg"
      aria-label="VIDSELLA"
    >
      <span className={tone === "panel" ? "text-white" : "text-brand"}>
        <LogoMark inner={tone === "panel" ? "var(--panel)" : "#ffffff"} />
      </span>
      <span
        className={`text-[17px] font-semibold tracking-[-0.01em] ${
          tone === "panel" ? "text-panel-ink" : "text-ink"
        }`}
      >
        VIDSELLA
      </span>
    </Link>
  );
}
