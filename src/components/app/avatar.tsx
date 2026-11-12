/** Photo de profil, ou initiale sur fond bleu. */
export function Avatar({ url, label, className = "h-9 w-9 text-sm" }: { url: string | null; label: string; className?: string }) {
  const initial = label.trim().charAt(0).toUpperCase();
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ring-2 ring-brand-soft ${className}`} />
  ) : (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-on-brand ${className}`}>
      {initial}
    </span>
  );
}
