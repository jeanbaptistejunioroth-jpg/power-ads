import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { verifySignature } from "@/lib/engine";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type EngineEvent = {
  event?: string;
  type?: string;
  video_id?: string;
  drive_file_url?: string;
  drive_url?: string;
  file_url?: string;
  error?: string;
  reason?: string;
};

const STATUS_BY_EVENT: Record<string, "in_production" | "delivered" | "failed"> = {
  "video.started": "in_production",
  "video.in_production": "in_production",
  "video.delivered": "delivered",
  "video.failed": "failed",
};

/**
 * Événements signés envoyés par le moteur n8n (SITE_CALLBACK_URL = https://vidsella.com/api/engine/events).
 * video.delivered → lien Drive enregistré ; video.failed → tokens de la vidéo recrédités (une seule fois).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const ok = verifySignature(
    process.env.SITE_CALLBACK_SECRET,
    request.headers.get("x-powerads-timestamp"),
    request.headers.get("x-powerads-signature"),
    raw,
  );
  if (!ok) return apiError("invalid_signature", 401);

  let evt: EngineEvent;
  try {
    evt = JSON.parse(raw) as EngineEvent;
  } catch {
    return apiError("invalid_body", 400);
  }

  const status = STATUS_BY_EVENT[evt.event ?? evt.type ?? ""];
  if (!status) return NextResponse.json({ ignored: true });
  if (!evt.video_id || !/^[0-9a-f-]{36}$/i.test(evt.video_id)) return apiError("invalid_video_id", 400);

  const driveUrl = evt.drive_file_url ?? evt.file_url ?? evt.drive_url ?? null;
  const { data, error } = await createAdminClient().rpc("engine_update_video", {
    p_video: evt.video_id,
    p_status: status,
    p_drive_url: driveUrl && driveUrl.startsWith("https://") ? driveUrl : null,
    p_error: status === "failed" ? (evt.error ?? evt.reason ?? "échec de production").slice(0, 1000) : null,
  });

  if (error) {
    if (error.message.includes("video_not_found")) return apiError("video_not_found", 404);
    console.error("[engine/events]", error);
    return apiError("update_failed", 500);
  }
  return NextResponse.json({ ok: true, order_status: data });
}
