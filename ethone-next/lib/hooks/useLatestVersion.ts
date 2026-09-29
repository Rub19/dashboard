"use client";

import { useEffect, useState } from "react";

/**
 * Juste le numéro de version le plus récent (ex. "v1.37.19"), sans embarquer tout `data/changelog.ts`
 * (39k+ lignes, ~2.2MB, tout l'historique multilingue depuis le début du projet) dans le bundle initial
 * des pages qui n'ont besoin que de ce seul numéro (en-têtes Settings). Le module n'est chargé qu'ici,
 * à la demande, une fois après le montage.
 */
export function useLatestVersion(fallback = "v1.24.0"): string {
  const [version, setVersion] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    import("@/data/changelog").then(({ CHANGELOG }) => {
      if (!cancelled && CHANGELOG[0]?.version) setVersion(CHANGELOG[0].version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
