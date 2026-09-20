"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Le Dock et la Dynamic Island sont dessinés HORS de la zone principale de l'app (contexte
 * d'empilement différent) : un `z-index` plus fort sur une modale ne suffit donc pas, ils passent
 * toujours par-dessus (ex. le Dock masquait le bouton « Compris » du journal des versions).
 *
 * On observe donc la présence d'une boîte de dialogue modale et on pose `data-modal-open` sur
 * <html> ; le CSS (globals.css) masque alors tout élément marqué \`data-chrome\`.
 */
// Modales déclarées correctement (role/aria-modal) + les anciennes, qui n'ont qu'un fond noir
// plein écran (Palette de commandes, composition de mail, tâche IA, rapport quotidien…).
const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], .fixed.inset-0[class*="bg-black"]';

/**
 * Pages plein écran où le Dock et la Dynamic Island gênent (cas par cas) :
 *  - /games : le jeu occupe tout l'écran, le Dock recouvrait le bouton « SOLO » et l'île le haut du canvas.
 * Les autres pages gardent leurs deux éléments.
 */
const IMMERSIVE_ROUTES = ["/games"];

export default function ModalAwareChrome() {
  const pathname = usePathname() || "";
  const immersive = IMMERSIVE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  useEffect(() => {
    const root = document.documentElement;
    if (immersive) root.setAttribute("data-hide-chrome", "true");
    else root.removeAttribute("data-hide-chrome");
    return () => root.removeAttribute("data-hide-chrome");
  }, [immersive]);

  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = () => {
      timer = null;
      if (document.querySelector(MODAL_SELECTOR)) root.setAttribute("data-modal-open", "true");
      else root.removeAttribute("data-modal-open");
    };
    // Regroupe les rafales de mutations (animations React) en une seule vérification.
    const schedule = () => {
      if (timer === null) timer = setTimeout(check, 40);
    };

    check();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      root.removeAttribute("data-modal-open");
    };
  }, []);

  return null;
}
