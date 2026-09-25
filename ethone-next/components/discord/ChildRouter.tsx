"use client";

import type { ReactNode } from "react";
import { usePathSegment } from "@/lib/hooks/usePathSegment";

/**
 * Affiche une sous-page fixe (ex. « create ») à la place de la page de détail quand l'adresse la vise.
 *
 * Pourquoi : le site est exporté en statique et toute adresse `/discord/polls/<x>/` est réécrite (`public/_redirects`) vers la page
 * modèle `/discord/polls/demo/`, y compris `/discord/polls/create/` : Cloudflare Pages applique les réécritures même quand un fichier
 * existe, et il n'existe pas de règle fiable pour exclure une adresse. Plutôt que de lutter contre la réécriture, la page de détail
 * choisit elle-même l'écran d'après l'adresse réelle du navigateur (comme `usePathSegment` pour l'identifiant).
 */
export default function ChildRouter({
  after,
  routes,
  children,
}: {
  /** Segment qui précède l'identifiant (ex. « polls »). */
  after: string;
  /** Écran à afficher selon la valeur du segment suivant (ex. `{ create: <PollCreateClient /> }`). */
  routes: Record<string, ReactNode>;
  /** Écran par défaut : la page de détail. */
  children: ReactNode;
}) {
  const segment = usePathSegment(after);
  return <>{Object.prototype.hasOwnProperty.call(routes, segment) ? routes[segment] : children}</>;
}
