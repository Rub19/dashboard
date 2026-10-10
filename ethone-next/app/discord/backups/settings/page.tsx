import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Paramètres de Sauvegarde & Rétention | ETHONE",
  description: "Planification automatique et politique de conservation des sauvegardes.",
};


/** Ancienne sous-page : son contenu est maintenant dans le module « backups » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="backups" />;
}
