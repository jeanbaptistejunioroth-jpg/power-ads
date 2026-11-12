import type { Dictionary } from "./i18n/dictionaries/fr";
import { fmt } from "./i18n/format";
import { longestVideo, REFERENCE_STYLE, type TokenGrid } from "./order";

type PricingText = Dictionary["landing"]["pricing"];

/** « 8 vidéos de 30 s » / « 1 vidéo face caméra de 30 s », accordé selon la langue. */
export function videoPhrase(p: PricingText, locale: string) {
  const nf = new Intl.NumberFormat(locale);
  const plural = new Intl.PluralRules(locale);
  return (n: number, d: number, talkingHead = false) => {
    const one = plural.select(n) === "one";
    const template = talkingHead ? (one ? p.videoFaceOne : p.videoFaceMany) : one ? p.videoOne : p.videoMany;
    return fmt(template, { n: nf.format(n), d });
  };
}

/** Ce que permet un petit montant de tokens : « 1 vidéo de 15 s ou 1 vidéo face caméra de 30 s ». */
export function trialVideos(tokens: number, grid: TokenGrid, p: PricingText, locale: string) {
  const phrase = videoPhrase(p, locale);
  const ref = longestVideo(tokens, grid, REFERENCE_STYLE);
  const face = longestVideo(tokens, grid, "talking_head");
  const a = ref ? phrase(ref.n, ref.d) : null;
  // Le face caméra n'est cité que s'il permet une vidéo plus longue que le style de référence.
  const b = face && (!ref || face.d > ref.d) ? phrase(face.n, face.d, true) : null;
  return a && b ? fmt(p.trialEquiv, { a, b }) : (a ?? b ?? "");
}
