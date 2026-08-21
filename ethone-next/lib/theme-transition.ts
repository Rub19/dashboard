import { startTransition } from "react";
import {
  applyTheme,
  applyAccent,
  resolvePremiumTheme,
  THEME_DEFINITIONS,
  type PremiumTheme,
} from "./theme-engine";

const ACCENTS: Record<string, string> = {
  violet: "#8b5cf6",
  mint: "#34d399",
  sky: "#38bdf8",
  amber: "#f59e0b",
  rose: "#f43f5e",
  teal: "#14b8a6",
  coral: "#f97316",
};

export function getEffectiveAccent(
  themeId: PremiumTheme | string,
  accentColor?: string,
  customAccent?: string
): string {
  const resolved = resolvePremiumTheme(String(themeId || ""));
  const def = THEME_DEFINITIONS[resolved];
  if (accentColor === "custom" && customAccent) return customAccent;
  return ACCENTS[accentColor || ""] || def?.accentPrimary || "#8b5cf6";
}

function setNoTransitions(html: HTMLElement) {
  html.setAttribute("data-no-transitions", "true");
}

function restoreTransitions(html: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.removeAttribute("data-no-transitions");
    });
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

/**
 * Apply a new theme and accent synchronously, with CSS transitions temporarily
 * disabled to avoid the jank caused by thousands of components animating
 * color/border/background at the same time.
 *
 * The React state update is wrapped in `startTransition` so the UI stays
 * responsive while the theme engine updates the document root.
 */
export function transitionTheme(
  themeId: PremiumTheme | string,
  onChange: (themeId: string) => void,
  options?: {
    accentColor?: string;
    customAccent?: string;
    reducedMotion?: boolean;
  }
): void {
  if (typeof document === "undefined") {
    onChange(String(themeId));
    return;
  }

  const html = document.documentElement;
  const resolved = resolvePremiumTheme(String(themeId || ""));
  const accent = getEffectiveAccent(resolved, options?.accentColor, options?.customAccent);

  const reduced = options?.reducedMotion || prefersReducedMotion();

  // For reduced-motion users, keep it instant and minimal.
  if (reduced) {
    html.setAttribute("data-no-transitions", "true");
    applyTheme(resolved);
    applyAccent(html, accent);
    startTransition(() => onChange(String(themeId)));
    requestAnimationFrame(() => html.removeAttribute("data-no-transitions"));
    return;
  }

  setNoTransitions(html);
  applyTheme(resolved);
  applyAccent(html, accent);
  startTransition(() => onChange(String(themeId)));
  restoreTransitions(html);
}
