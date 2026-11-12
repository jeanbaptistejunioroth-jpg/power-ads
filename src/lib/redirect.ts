/**
 * Chemin interne sûr pour revenir après la connexion (« /videos »), sinon `fallback`.
 * Refuse tout ce qu'un navigateur lirait comme une autre adresse :
 * « //site.com », « /\site.com », caractères de contrôle, schémas (« javascript: »)…
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://vidsella.invalid";
    if (new URL(next, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return next;
}
