"use client";

import { useEffect } from "react";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

/**
 * Ancienne adresse d'un module (`/discord/<module>/?guildId=…`) : le module vit maintenant dans la console. On garde
 * l'adresse pour les favoris et les liens déjà partagés, et on renvoie vers la console en conservant le serveur.
 */
export default function LegacyModuleRedirect({ module, view, tab }: { module?: string; view?: string; tab?: string }) {
  useEffect(() => {
    const guildId = new URLSearchParams(window.location.search).get("guildId");
    const params = new URLSearchParams();
    if (guildId) params.set("guildId", guildId);
    if (view) params.set("view", view);
    else if (module) params.set("module", module);
    if (tab) params.set("tab", tab);
    window.location.replace(`/discord/?${params.toString()}`);
  }, [module, view, tab]);
  return <ModuleSkeleton label="Ouverture du module" />;
}
