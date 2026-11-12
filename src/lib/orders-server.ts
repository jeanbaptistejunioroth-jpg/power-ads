import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DURATIONS,
  FALLBACK_TOKENS,
  VIDEO_STYLES,
  type Duration,
  type OrderStatus,
  type TokenGrid,
  type VideoStatus,
  type VideoStyle,
} from "./order";

const isDuration = (d: number): d is Duration => (DURATIONS as readonly number[]).includes(d);
const isStyle = (s: unknown): s is VideoStyle => (VIDEO_STYLES as readonly unknown[]).includes(s);

/**
 * Grille tarifaire en base (pricing_rules) : prix par style et par durée — exactement ce que
 * place_order_for débitera. Avant la migration 0006, un seul prix par durée (appliqué à tous
 * les styles, comme la base). Grille de secours si la table n'est pas lisible.
 */
export async function getPricing(supabase: SupabaseClient): Promise<TokenGrid> {
  const grid = structuredClone(FALLBACK_TOKENS);
  const byStyle = await supabase.from("pricing_rules").select("duration_s, video_style, tokens").eq("active", true);
  if (!byStyle.error && byStyle.data?.length) {
    for (const row of byStyle.data as { duration_s: number; video_style: unknown; tokens: number }[]) {
      if (isDuration(row.duration_s) && isStyle(row.video_style)) grid[row.video_style][row.duration_s] = row.tokens;
    }
    return grid;
  }
  const legacy = await supabase.from("pricing_rules").select("duration_s, tokens").eq("active", true);
  if (!legacy.error && legacy.data?.length) {
    for (const row of legacy.data as { duration_s: number; tokens: number }[]) {
      if (isDuration(row.duration_s)) for (const s of VIDEO_STYLES) grid[s][row.duration_s] = row.tokens;
    }
  }
  return grid;
}

export type OrderSummary = {
  id: string;
  ref: string;
  status: OrderStatus;
  product: { name: string; images: string[] };
  video_count: number;
  total_tokens: number;
  aspect_ratio: string;
  created_at: string;
  order_videos: { duration_s: number; status: VideoStatus; drive_url: string | null }[];
};

export async function listOrders(supabase: SupabaseClient, limit = 50): Promise<OrderSummary[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, ref, status, product, video_count, total_tokens, aspect_ratio, created_at, order_videos(duration_s, status, drive_url)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as OrderSummary[];
}

export type OrderVideo = {
  id: string;
  position: number;
  duration_s: number;
  tokens: number;
  script: string;
  status: VideoStatus;
  refunded: boolean;
  drive_url: string | null;
  error: string | null;
  delivered_at: string | null;
};

export type OrderDetail = Omit<OrderSummary, "order_videos" | "product"> & {
  product: { name: string; url: string; description: string; price: string; images: string[]; source: string };
  audience: Record<string, unknown>;
  script_mode: "client" | "ai";
  video_style: string | null;
  language: "fr" | "en";
  style: string | null;
  whatsapp: string | null;
  order_videos: OrderVideo[];
};

export async function getOrder(supabase: SupabaseClient, id: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, ref, status, product, audience, script_mode, video_style, language, style, whatsapp, video_count, total_tokens, aspect_ratio, created_at, order_videos(id, position, duration_s, tokens, script, status, refunded, drive_url, error, delivered_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const order = data as unknown as OrderDetail;
  order.order_videos.sort((a, b) => a.position - b.position);
  return order;
}
