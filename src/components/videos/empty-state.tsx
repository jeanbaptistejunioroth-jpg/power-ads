import Link from "next/link";
import { Plus } from "lucide-react";
import { DotGrid, PlayButton, Sparkle, VideoThumb } from "@/components/decor";

export function EmptyState({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <div className="relative isolate flex flex-col items-center overflow-hidden rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center">
      <DotGrid className="inset-0 -z-10 opacity-60" />
      <div className="relative flex h-28 items-end justify-center" aria-hidden>
        <VideoThumb hue={1} slot={1} className="w-14 -rotate-12 translate-x-3 translate-y-1 opacity-80" />
        <VideoThumb hue={0} slot={0} className="relative z-10 w-16" />
        <VideoThumb hue={3} slot={2} className="w-14 rotate-12 -translate-x-3 translate-y-1 opacity-80" />
        <span className="absolute -bottom-3 start-1/2 z-20 -translate-x-1/2 rtl:translate-x-1/2">
          <PlayButton className="h-9 w-9" />
        </span>
        <Sparkle className="absolute -top-1 end-[-1.25rem] h-4 w-4 text-brand-text" />
      </div>
      <p className="mt-7 text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-ink-2">{body}</p>
      <Link href="/videos/new" className="btn btn-primary btn-md mt-7">
        <Plus size={18} aria-hidden /> {cta}
      </Link>
    </div>
  );
}
