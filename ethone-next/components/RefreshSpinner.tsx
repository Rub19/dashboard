"use client";

import { useEffect } from "react";

const REFRESH_LABEL = /actualis|rafra[iî]chi|refresh|reload|synchro|sync\b/i;
const MIN_SPIN_MS = 900;
const MAX_SPIN_MS = 15_000;

/**
 * Fait tourner l'icône de TOUS les boutons « Actualiser » (et équivalents) au clic, comme un rafraîchissement : au moins
 * 0,9 s, et tant que le bouton reste désactivé ou marqué occupé (chargement en cours), dans la limite de 15 s. Un seul
 * écouteur global : aucune page n'a besoin d'être modifiée. `data-no-spin` désactive l'effet sur un bouton précis.
 */
export default function RefreshSpinner() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      const button = (e.target as Element | null)?.closest?.("button, [role='button']") as HTMLElement | null;
      if (!button || button.hasAttribute("data-no-spin") || button.classList.contains("refresh-spin")) return;
      const label = `${button.textContent ?? ""} ${button.getAttribute("aria-label") ?? ""} ${button.getAttribute("title") ?? ""}`;
      if (!REFRESH_LABEL.test(label) || !button.querySelector("svg")) return;

      button.classList.add("refresh-spin");
      const started = Date.now();
      const busy = () => (button as HTMLButtonElement).disabled === true || button.getAttribute("aria-busy") === "true";
      const tick = () => {
        const elapsed = Date.now() - started;
        if (!button.isConnected || elapsed >= MAX_SPIN_MS || (elapsed >= MIN_SPIN_MS && !busy())) {
          button.classList.remove("refresh-spin");
          return;
        }
        setTimeout(tick, 250);
      };
      setTimeout(tick, MIN_SPIN_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
