"use client";

import { usePathname } from "next/navigation";

/**
 * Segment d'adresse qui suit `/<after>/` dans l'URL réelle du navigateur (ex. `usePathSegment("forms")` sur
 * `/discord/forms/abc/responses/` renvoie `abc`).
 *
 * Pourquoi pas `useParams()` : le site est exporté en statique. Une adresse comme `/discord/forms/abc/` est servie par
 * une règle de réécriture depuis la page modèle `/discord/forms/demo/` ; au rechargement, `useParams()` renvoie alors
 * « demo » et non l'identifiant réel, et la page interrogeait le bot sur « demo ». L'adresse du navigateur, elle, est
 * toujours la vraie.
 */
export function usePathSegment(after: string, fallback = ""): string {
  const pathname = usePathname() || "";
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf(after);
  const value = index >= 0 ? parts[index + 1] : undefined;
  return value ? decodeURIComponent(value) : fallback;
}
