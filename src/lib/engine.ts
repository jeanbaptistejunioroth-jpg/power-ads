import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────
// Échanges signés entre le site et le moteur n8n (contrat du guide moteur, étape 10).
//   Signature : X-PowerAds-Timestamp (secondes Unix)
//               X-PowerAds-Signature: sha256=HMAC_SHA256(secret, timestamp + "." + corps brut)
//   Fenêtre de validité : 5 minutes.
// ─────────────────────────────────────────────────────────────

const MAX_SKEW_S = 300;

export function sign(secret: string, timestamp: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifySignature(secret: string | undefined, timestamp: string | null, signature: string | null, body: string) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_S) return false;
  const expected = Buffer.from(sign(secret, timestamp, body));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type OrderRow = {
  id: string;
  ref: string;
  user_id: string;
  product: { name: string; url: string; description: string; price: string; images: string[]; source: string };
  audience: Record<string, unknown>;
  script_mode: "client" | "ai";
  style: string | null;
  aspect_ratio: string;
  video_style: string | null;
  language: "fr" | "en";
  whatsapp: string | null;
  engine_attempts: number;
  order_videos: { id: string; position: number; duration_s: number; script: string }[];
};

/**
 * Envoie une commande au moteur. Sans ENGINE_ORDER_URL (développement), la commande
 * reste « pending » : elle sera envoyée dès que le moteur est branché.
 */
export async function dispatchOrder(orderId: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const url = process.env.ENGINE_ORDER_URL;
  const secret = process.env.ENGINE_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, skipped: true };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, ref, user_id, product, audience, script_mode, style, aspect_ratio, video_style, language, whatsapp, engine_attempts, order_videos(id, position, duration_s, script)")
    .eq("id", orderId)
    .single();
  if (error || !data) return { ok: false, error: "order_not_found" };
  const order = data as unknown as OrderRow;

  const [{ data: userData }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(order.user_id),
    admin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle<{ full_name: string | null }>(),
  ]);

  const payload = {
    order_id: order.ref,
    client: {
      id: order.user_id,
      name: profile?.full_name || userData.user?.email || "Client",
      email: userData.user?.email ?? null,
      whatsapp: order.whatsapp,
      locale: order.language,
    },
    product: {
      name: order.product.name,
      url: order.product.url || null,
      description: order.product.description,
      price: order.product.price || null,
      image_urls: order.product.images,
      source: order.product.source,
    },
    audience: order.audience,
    language: order.language,
    style: order.style,
    script_mode: order.script_mode,
    video_style: order.video_style || "mixed",
    // Le script est validé par le client avant la commande : le moteur ne le réécrit pas.
    script: null,
    videos: [...order.order_videos]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        video_id: v.id,
        duration_s: v.duration_s,
        avatar_tier: "standard",
        aspect_ratio: order.aspect_ratio,
        script: v.script,
      })),
  };

  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  let result: { ok: boolean; error?: string };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PowerAds-Timestamp": timestamp,
        "X-PowerAds-Signature": sign(secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    result = res.status === 202 || res.ok ? { ok: true } : { ok: false, error: `engine_http_${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (e) {
    result = { ok: false, error: `engine_unreachable: ${e instanceof Error ? e.message : "unknown"}` };
  }

  await admin
    .from("orders")
    .update(
      result.ok
        ? { status: "sent", engine_sent_at: new Date().toISOString(), engine_attempts: order.engine_attempts + 1, last_engine_error: null }
        : { engine_attempts: order.engine_attempts + 1, last_engine_error: result.error },
    )
    .eq("id", order.id)
    .eq("status", "pending");

  return result;
}
