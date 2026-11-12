"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithSession } from "@/lib/supabase/realtime";
import { useI18n } from "@/lib/i18n/provider";
import { Alert } from "@/components/auth/parts";

export type SupportMessage = {
  id: string;
  sender: "user" | "agent";
  body: string;
  created_at: string;
};

export function SupportChat({ userId, initial }: { userId: string; initial: SupportMessage[] }) {
  const { t, locale } = useI18n();
  const s = t.app.support;
  const [messages, setMessages] = useState<SupportMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Réception en temps réel des réponses du service client.
  useEffect(() => {
    const supabase = createClient();
    return subscribeWithSession(supabase, () =>
      supabase
        .channel(`support:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` },
          (payload) => {
            const m = payload.new as SupportMessage;
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          },
        ),
    );
  }, [userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await createClient()
      .from("support_messages")
      .insert({ user_id: userId, sender: "user", body })
      .select("id, sender, body, created_at")
      .single<SupportMessage>();
    setSending(false);
    if (error || !data) return setError(error?.message.includes("rate_limited") ? s.rateLimited : s.error);
    setDraft("");
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  const time = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="card flex h-[min(70dvh,680px)] flex-col overflow-hidden">
      <div className="decor-chat flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
        {messages.length === 0 && <p className="py-10 text-center text-ink-2">{s.empty}</p>}
        {messages.map((m) => {
          const mine = m.sender === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] sm:max-w-[70%]">
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    mine ? "rounded-ee-md bg-brand text-on-brand" : "rounded-es-md bg-sunken text-ink"
                  }`}
                >
                  {m.body}
                </div>
                <p className={`mt-1.5 text-xs text-ink-3 ${mine ? "text-end" : ""}`}>
                  {mine ? s.you : s.agent} · {time.format(new Date(m.created_at))}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t border-line p-3 sm:p-4">
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}
        <div className="flex items-end gap-2">
          <label htmlFor="support-draft" className="sr-only">{s.placeholder}</label>
          <textarea
            id="support-draft"
            rows={1}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={s.placeholder}
            className="field h-auto max-h-40 min-h-[3.25rem] resize-none py-3.5"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary h-[3.25rem] w-[3.25rem] shrink-0 p-0" aria-label={s.send}>
            <SendHorizontal size={19} className="rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </div>
  );
}
