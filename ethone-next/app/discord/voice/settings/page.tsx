import type { Metadata } from "next";
import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata: Metadata = {
  title: "Paramètres Salons Vocaux — ETHONE",
  description: "Configuration du Join-to-Create, délais de suppression, permissions et automatisation.",
};

export const dynamic = "force-static";

/** Ancienne sous-page : son contenu est maintenant dans le module « voice » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="voice" />;
}
