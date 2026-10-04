/**
 * Ouvre le studio de thèmes (Réglages › Thèmes) sur une action précise, depuis le clic droit du menu « Thèmes » :
 * - "font" : éditeur de police de ce thème ;
 * - "duplicate" : créateur de thème pré-rempli avec les couleurs de ce thème ;
 * - "new" : créateur de thème vide.
 * L'intention passe par sessionStorage (le studio n'est pas encore affiché) et par un événement (il l'est déjà).
 */
export type ThemeIntent = { action: "font" | "duplicate" | "new"; themeId?: string };

export const THEME_INTENT_KEY = "ethone:theme-intent";
export const THEME_INTENT_EVENT = "ethone:theme-intent";
export const THEME_STUDIO_PATH = "/settings/themes/";

export function sendThemeIntent(intent: ThemeIntent): void {
  try {
    sessionStorage.setItem(THEME_INTENT_KEY, JSON.stringify(intent));
  } catch {}
  window.dispatchEvent(new CustomEvent<ThemeIntent>(THEME_INTENT_EVENT, { detail: intent }));
}

/** Lit puis efface l'intention en attente (une seule exécution). */
export function takeThemeIntent(): ThemeIntent | null {
  try {
    const raw = sessionStorage.getItem(THEME_INTENT_KEY);
    sessionStorage.removeItem(THEME_INTENT_KEY);
    return raw ? (JSON.parse(raw) as ThemeIntent) : null;
  } catch {
    return null;
  }
}
