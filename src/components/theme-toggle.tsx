"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        // Revenir au thème de l'appareil réactive le mode automatique (jour / nuit de l'appareil).
        setTheme(next === systemTheme ? "system" : next);
      }}
      aria-label={t.common.theme.toggle}
      title={t.common.theme.toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      {mounted ? isDark ? <Sun size={18} /> : <Moon size={18} /> : <span className="h-[18px] w-[18px]" />}
    </button>
  );
}
