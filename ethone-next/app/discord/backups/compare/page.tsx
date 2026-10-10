import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Comparateur de Sauvegardes | ETHONE",
  description: "Comparez deux snapshots ou l'état en direct de votre serveur Discord.",
};


/** Ancienne sous-page : son contenu est maintenant dans le module « backups » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="backups" />;
}
