"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { Avatar } from "@/components/app/avatar";
import { Alert, Spinner } from "@/components/auth/parts";
import { updateAvatar } from "@/app/(app)/settings/actions";

const SIZE = 512;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/** Recadre au centre en carré 512 px et réencode en JPEG (supprime aussi les données EXIF, dont la position GPS). */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9),
  );
}

export function AvatarPicker({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const { t } = useI18n();
  const s = t.app.settings.profile;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function choose(file: File | undefined) {
    if (!file) return;
    setState("busy");
    try {
      if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) throw new Error("type");
      const blob = await toSquareJpeg(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const res = await updateAvatar(path);
      if (!res.ok) throw new Error("save");
      setPreview(URL.createObjectURL(blob));
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setState("busy");
    const res = await updateAvatar(null);
    if (res.ok) {
      setPreview(null);
      setState("idle");
      router.refresh();
    } else setState("error");
  }

  return (
    <div>
      <p className="label">{s.photo}</p>
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar url={preview} label={name || "?"} className="h-20 w-20 text-2xl" />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={state === "busy"}
            className="absolute -bottom-1 -end-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-elev bg-brand text-on-brand"
            aria-label={preview ? s.photoChange : s.photoAdd}
          >
            {state === "busy" ? <Spinner /> : <Camera size={15} />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={state === "busy"} className="btn btn-ghost btn-sm">
            {preview ? s.photoChange : s.photoAdd}
          </button>
          {preview && (
            <button type="button" onClick={remove} disabled={state === "busy"} className="btn btn-sm px-3 text-ink-2 hover:text-danger">
              <Trash2 size={15} aria-hidden /> {s.photoRemove}
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <p className="hint">{s.photoHint}</p>
      {state === "saved" && <div className="mt-3"><Alert tone="success">{s.photoSaved}</Alert></div>}
      {state === "error" && <div className="mt-3"><Alert>{s.photoError}</Alert></div>}
    </div>
  );
}
