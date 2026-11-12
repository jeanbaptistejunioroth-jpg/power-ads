// Parcours « essai » : /signup?trial=1 → compte créé et vérifié → Billing, montant libre au minimum.
// Sans import : ce fichier est aussi lu par le middleware.

/** Page d'arrivée après une inscription commencée par une offre d'essai. */
export const TRIAL_PATH = "/billing?trial=1";

/**
 * Posé sur /signup?trial=1, effacé en arrivant sur Billing. Filet de sécurité si le paramètre
 * se perd en route (page rechargée après le code e-mail, retour Google sans `next`).
 */
export const TRIAL_COOKIE = "pa_trial";
