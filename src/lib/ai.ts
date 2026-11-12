import "server-only";
import type { AudienceInput, Duration, VideoStyle } from "./order";
import { wordRange } from "./order";

// ─────────────────────────────────────────────────────────────
// Rédaction des scripts publicitaires (avant la commande, pour validation par le client).
// Passe par fal.ai (endpoint OpenRouter) avec la même clé que le moteur vidéo.
// Sans FAL_KEY, renvoie des scripts de démonstration pour tester l'interface.
// ─────────────────────────────────────────────────────────────

const FAL_URL = "https://fal.run/openrouter/router";
// Modèle à vérifier dans le catalogue OpenRouter au moment de brancher la clé.
const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

export type ScriptRequest = {
  product: { name: string; description: string; price?: string; url?: string };
  audience: AudienceInput;
  video_style?: VideoStyle;
  language: "fr" | "en";
  duration: Duration;
  count: number;
  style?: string;
  /** Scripts déjà proposés, pour obtenir des angles différents lors d'une régénération. */
  avoid?: string[];
};

export type ScriptResult = { scripts: string[]; simulated: boolean };

const AUDIENCE_LABELS: Record<string, string> = {
  central_africa: "Central Africa (Cameroon, Gabon, Congo…)",
  west_africa: "West Africa (Senegal, Côte d'Ivoire, Nigeria…)",
  north_africa: "North Africa (Morocco, Algeria, Tunisia)",
  europe: "Europe",
  north_america: "North America",
  middle_east: "Middle East",
  asia: "Asia",
  global: "International / mixed",
  women: "women",
  men: "men",
  mixed: "women and men",
  dynamic: "energetic and punchy",
  testimonial: "authentic customer testimonial (UGC, first person)",
  premium: "premium, elegant and calm",
  humor: "light and humorous",
  educational: "educational, explains how it works",
};

const STYLE_HINTS: Record<VideoStyle, string> = {
  mixed: "a presenter talks to camera, with product shots cut in between. Write it as natural first-person speech.",
  talking_head: "a single presenter talks to camera the whole time (UGC testimonial). Write it as natural first-person speech.",
  broll_voiceover: "a voice-over on product shots, nobody on screen. Write it as a narrator, short visual sentences.",
};

function systemPrompt(lang: "fr" | "en") {
  return [
    "You are a senior direct-response copywriter who writes short-form video ads (TikTok, Reels, Shorts) for e-commerce brands.",
    "You write ONLY the words that will be spoken by the on-screen presenter or the voice-over: no stage directions, no shot list, no emojis, no hashtags, no quotation marks, no labels like 'Hook:'.",
    "Structure each script as: a scroll-stopping hook in the first 2 seconds, the problem or desire, the product as the answer with 1–3 concrete benefits taken from the product description, light proof or reassurance, then a clear call to action.",
    "Never invent facts that are not in the product information (no fake reviews, numbers, certifications, medical or financial claims, discounts or delivery promises).",
    "Write for the audience described, in a natural spoken register, short sentences, easy to pronounce.",
    `Write in ${lang === "fr" ? "French (natural, not translated-sounding; vouvoiement unless the tone is humorous)" : "English"}.`,
    'Reply with JSON only, exactly in this shape: {"scripts": ["...", "..."]}',
  ].join("\n");
}

function userPrompt(req: ScriptRequest) {
  const { min, max } = wordRange(req.duration, req.language);
  const a = req.audience;
  const lines = [
    `Write ${req.count} different ad script${req.count > 1 ? "s" : ""}, each for a ${req.duration}-second video.`,
    `Each script must be between ${min} and ${max} words.`,
    req.count > 1 ? "Each script must use a different angle and a different hook." : "",
    "",
    "PRODUCT",
    `Name: ${req.product.name}`,
    req.product.price ? `Price: ${req.product.price}` : "",
    req.product.url ? `Page: ${req.product.url}` : "",
    `Description: ${req.product.description.slice(0, 2500)}`,
    "",
    "AUDIENCE",
    `Region: ${a.regions.map((r) => AUDIENCE_LABELS[r] ?? r).join(", ")}`,
    `Gender: ${AUDIENCE_LABELS[a.gender] ?? a.gender}`,
    `Age: ${a.ages.join(", ")}`,
    `Tone: ${AUDIENCE_LABELS[a.tone] ?? a.tone}`,
    `Video format: ${STYLE_HINTS[req.video_style ?? "mixed"]}`,
    req.style ? `Extra instructions from the brand: ${req.style.slice(0, 600)}` : "",
    req.avoid?.length ? `\nDo NOT reuse these hooks or angles:\n- ${req.avoid.map((s) => s.slice(0, 160)).join("\n- ")}` : "",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function parseScripts(output: string, count: number): string[] {
  const cleaned = output.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("ai_bad_output");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { scripts?: unknown };
  const scripts = Array.isArray(parsed.scripts)
    ? parsed.scripts.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter((s) => s.length >= 20)
    : [];
  if (scripts.length < count) throw new Error("ai_bad_output");
  return scripts.slice(0, count).map((s) => s.slice(0, 4000));
}

export async function generateScripts(req: ScriptRequest): Promise<ScriptResult> {
  const key = process.env.FAL_KEY;
  if (!key) return { scripts: demoScripts(req), simulated: true };

  const res = await fetch(FAL_URL, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.SCRIPT_MODEL || DEFAULT_MODEL,
      system_prompt: systemPrompt(req.language),
      prompt: userPrompt(req),
      temperature: 0.9,
      max_tokens: 400 + req.count * Math.round(req.duration * 6),
    }),
    signal: AbortSignal.timeout(90_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ai_http_${res.status}`);
  const data = (await res.json()) as { output?: string; error?: string };
  if (!data.output) throw new Error(data.error ? "ai_error" : "ai_empty");
  return { scripts: parseScripts(data.output, req.count), simulated: false };
}

/** Scripts de démonstration (aucune clé API) : servent uniquement à tester le parcours. */
function demoScripts(req: ScriptRequest): string[] {
  const n = req.product.name;
  const fr = [
    `Arrêtez de chercher, j'ai trouvé ${n}. Franchement, je ne pensais pas que ça changerait autant mon quotidien. C'est simple à utiliser, la qualité se sent dès qu'on l'a en main, et le rendu est exactement comme sur les photos. Si vous hésitiez encore, c'est le moment. Cliquez sur le lien et commandez le vôtre aujourd'hui.`,
    `Vous aussi, vous en avez marre des produits qui ne tiennent pas leurs promesses ? Voici ${n}. Pensé pour durer, agréable au quotidien, et livré directement chez vous. Regardez ce détail : c'est ce qui fait toute la différence. Rejoignez celles et ceux qui l'ont déjà adopté. Commandez maintenant en cliquant sur le lien.`,
    `Trois raisons d'adopter ${n}. Un : il vous fait gagner du temps. Deux : il est conçu avec soin. Trois : il vous ressemble. Ne laissez pas passer l'occasion, le stock part vite. Appuyez sur le bouton et recevez-le très bientôt.`,
  ];
  const en = [
    `Stop scrolling, I finally found ${n}. Honestly, I didn't expect it to make such a difference. It's easy to use, you can feel the quality the moment you hold it, and it looks exactly like the photos. If you were on the fence, this is your sign. Tap the link and get yours today.`,
    `Tired of products that never live up to the hype? Meet ${n}. Built to last, a pleasure to use every day, and delivered straight to your door. Look at this detail, that's what makes the difference. Join everyone who already switched. Order now through the link.`,
    `Three reasons to get ${n}. One: it saves you time. Two: it's made with care. Three: it just fits your style. Don't miss out, it sells fast. Tap the button and get it delivered soon.`,
  ];
  const pool = req.language === "fr" ? fr : en;
  return Array.from({ length: req.count }, (_, i) => pool[(i + (req.avoid?.length ?? 0)) % pool.length]);
}
