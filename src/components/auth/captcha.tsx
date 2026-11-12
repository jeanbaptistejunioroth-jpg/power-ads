"use client";

import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";

// Clé publique Cloudflare Turnstile. Vide = pas de CAPTCHA (à désactiver aussi dans Supabase).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_unavailable"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Anti-robots pour les appels d'authentification protégés par Supabase (connexion, envoi de code).
 * `getToken()` fournit un jeton neuf à chaque appel (un jeton ne sert qu'une fois), ou undefined
 * si le CAPTCHA n'est pas configuré. `widget` doit rester affiché tant que le formulaire peut
 * encore envoyer une demande (ex. « Renvoyer le code ») ; il n'apparaît que si Cloudflare
 * demande une interaction.
 */
export function useCaptcha() {
  const { locale } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const ready = useRef<Promise<string | null>>(Promise.resolve(null));
  const pending = useRef<((token: string | undefined) => void) | null>(null);
  const used = useRef(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    let id: string | null = null;
    const settle = (token: string | undefined) => {
      pending.current?.(token);
      pending.current = null;
    };
    ready.current = loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return null;
        id = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          execution: "execute",
          appearance: "interaction-only",
          theme: "auto",
          language: locale,
          callback: (token: string) => settle(token),
          "error-callback": () => settle(undefined),
        });
        return id;
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
      used.current = false;
      settle(undefined);
    };
  }, [locale]);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!SITE_KEY) return undefined;
    const id = await ready.current;
    const turnstile = window.turnstile;
    if (!id || !turnstile) return undefined;
    return new Promise((resolve) => {
      pending.current?.(undefined);
      pending.current = resolve;
      if (used.current) turnstile.reset(id);
      used.current = true;
      turnstile.execute(id);
    });
  }, []);

  const widget = SITE_KEY ? <div ref={container} className="mt-6 flex justify-center empty:hidden" /> : null;
  return { widget, getToken };
}

/** Message d'erreur d'authentification : limite, CAPTCHA refusé, ou message par défaut. */
export function authErrorMessage(
  error: { status?: number; code?: string },
  t: { auth: { captchaFailed: string; signup: { rateLimited: string } } },
  fallback: string,
) {
  if (error.status === 429) return t.auth.signup.rateLimited;
  if (error.code === "captcha_failed") return t.auth.captchaFailed;
  return fallback;
}
