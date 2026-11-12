import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiUser, rateLimit, readJson } from "@/lib/api";
import { generateScripts } from "@/lib/ai";
import { audienceSchema, MAX_VIDEOS, VIDEO_STYLES, VOICE_LANGUAGES } from "@/lib/order";

export const runtime = "nodejs";
export const maxDuration = 120;

const DAILY_LIMIT = 40;

const requestSchema = z.object({
  product: z.object({
    name: z.string().trim().min(2).max(140),
    description: z.string().trim().min(20).max(4000),
    price: z.string().trim().max(40).optional(),
    url: z.string().trim().max(2048).optional(),
  }),
  audience: audienceSchema,
  video_style: z.enum(VIDEO_STYLES).default("mixed"),
  language: z.enum(VOICE_LANGUAGES),
  duration: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  count: z.number().int().min(1).max(MAX_VIDEOS),
  style: z.string().trim().max(600).optional(),
  avoid: z.array(z.string().max(4000)).max(20).optional(),
});

/** Rédige les scripts proposés au client (il les valide ou les modifie avant de commander). */
export async function POST(request: Request) {
  const { user } = await apiUser();
  if (!user) return apiError("unauthorized", 401);

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("invalid_request", 400);

  // Limite quotidienne par compte : chaque demande compte, réussie ou non (coût IA).
  const limited = await rateLimit(user.id, "script", DAILY_LIMIT, 24 * 3600);
  if (limited) return limited;

  try {
    return NextResponse.json(await generateScripts(parsed.data));
  } catch (e) {
    console.error("[script] génération impossible", e);
    return apiError("generation_failed", 502);
  }
}
