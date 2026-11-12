import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Options du formulaire « Nouvelle vidéo » et validation de la commande.
// Les identifiants ci-dessous sont envoyés tels quels au moteur n8n :
// ne pas les renommer sans mettre à jour le moteur.
// ─────────────────────────────────────────────────────────────

export const DURATIONS = [15, 30, 60, 90, 120] as const;
export type Duration = (typeof DURATIONS)[number];

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;

/** Style de la vidéo : Claude en déduit le montage (passages face caméra ou plans d'illustration). */
export const VIDEO_STYLES = ["mixed", "talking_head", "broll_voiceover"] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const REGIONS = ["central_africa", "west_africa", "north_africa", "europe", "north_america", "middle_east", "asia", "global"] as const;
export const GENDERS = ["women", "men", "mixed"] as const;
export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
export const APPEARANCES = ["black", "mixed_race", "white", "north_african", "asian", "diverse"] as const;
export const TONES = ["dynamic", "testimonial", "premium", "humor", "educational"] as const;
export const VOICE_LANGUAGES = ["fr", "en"] as const;

export const MAX_VIDEOS = 10;
export const MAX_IMAGES = 10;

/** Prix d'une vidéo en tokens, par style et par durée. */
export type TokenGrid = Record<VideoStyle, Record<Duration, number>>;

/** Grille de secours (identique à la migration 0006), si la table pricing_rules n'est pas lisible. */
export const FALLBACK_TOKENS: TokenGrid = {
  talking_head: { 15: 55, 30: 90, 60: 160, 90: 235, 120: 305 },
  mixed: { 15: 80, 30: 130, 60: 235, 90: 340, 120: 440 },
  broll_voiceover: { 15: 95, 30: 160, 60: 290, 90: 415, 120: 545 },
};

/** Style de référence des équivalences « ≈ N vidéos de 30 s ». */
export const REFERENCE_STYLE: VideoStyle = "mixed";

/** Prix le plus bas de la grille (« à partir de X tokens »). */
export function minVideoPrice(grid: TokenGrid) {
  return Math.min(...VIDEO_STYLES.flatMap((s) => DURATIONS.map((d) => grid[s][d])));
}

/** Nombre de vidéos (style de référence) qu'un nombre de tokens permet de commander, arrondi vers le bas. */
export function videoEquivalence(tokens: number, grid: TokenGrid) {
  const p15 = grid[REFERENCE_STYLE][15];
  const p30 = grid[REFERENCE_STYLE][30];
  // Montant libre : en vidéos de 30 s si possible, sinon de 15 s, avec le reste en tokens.
  const d: Duration = tokens >= p30 ? 30 : 15;
  const unit = d === 30 ? p30 : p15;
  const n = Math.floor(tokens / unit);
  return { n30: Math.floor(tokens / p30), n15: Math.floor(tokens / p15), best: { n, d, rest: tokens - n * unit } };
}

/** Vidéo la plus longue qu'un nombre de tokens permet dans un style donné, et combien (null si aucune). */
export function longestVideo(tokens: number, grid: TokenGrid, style: VideoStyle) {
  const d = [...DURATIONS].reverse().find((x) => grid[style][x] <= tokens);
  return d ? { n: Math.floor(tokens / grid[style][d]), d } : null;
}

/** Débit de parole moyen d'une voix publicitaire, en mots par seconde. */
export const WORDS_PER_SECOND = { fr: 2.6, en: 2.5 } as const;

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Nombre de mots conseillé pour une durée donnée (fourchette). */
export function wordRange(duration: Duration, lang: "fr" | "en") {
  const target = Math.round(duration * WORDS_PER_SECOND[lang]);
  return { min: Math.round(target * 0.75), max: Math.round(target * 1.1), target };
}

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((u) => u.startsWith("https://"), "https_only");

export const productSchema = z.object({
  source: z.enum(["shopify", "manual"]),
  name: z.string().trim().min(2).max(140),
  url: z.union([httpsUrl, z.literal("")]).default(""),
  description: z.string().trim().min(20).max(4000),
  price: z.string().trim().max(40).default(""),
  images: z.array(httpsUrl).min(1).max(MAX_IMAGES),
});

export const audienceSchema = z.object({
  regions: z.array(z.enum(REGIONS)).min(1).max(REGIONS.length),
  gender: z.enum(GENDERS),
  ages: z.array(z.enum(AGE_RANGES)).min(1).max(AGE_RANGES.length),
  appearances: z.array(z.enum(APPEARANCES)).min(1).max(APPEARANCES.length),
  tone: z.enum(TONES),
});

export const orderSchema = z.object({
  product: productSchema,
  audience: audienceSchema,
  language: z.enum(VOICE_LANGUAGES),
  style: z.string().trim().max(600).default(""),
  duration_s: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  aspect_ratio: z.enum(ASPECT_RATIOS),
  video_style: z.enum(VIDEO_STYLES).default("mixed"),
  script_mode: z.enum(["client", "ai"]),
  scripts: z.array(z.string().trim().min(20).max(4000)).min(1).max(MAX_VIDEOS),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+[1-9][0-9]{6,14}$/)
    .or(z.literal(""))
    .default(""),
  scripts_confirmed: z.literal(true),
  // Total affiché au client (tokens) : doit correspondre au prix de la grille au moment de la commande.
  quoted_tokens: z.number().int().positive().max(1_000_000),
});

export type ProductInput = z.infer<typeof productSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

/** Normalise un numéro saisi (« 6 90 00 00 00 », « 00237… ») au format international +237690000000. */
export function normalizePhone(raw: string, defaultCountryCode = "237") {
  let v = raw.replace(/[\s.\-()]/g, "");
  if (!v) return "";
  if (v.startsWith("00")) v = "+" + v.slice(2);
  if (!v.startsWith("+")) v = `+${defaultCountryCode}${v.replace(/^0+/, "")}`;
  return v;
}

export type OrderStatus = "pending" | "sent" | "in_production" | "completed" | "partial" | "failed";
export type VideoStatus = "pending" | "in_production" | "delivered" | "failed";
