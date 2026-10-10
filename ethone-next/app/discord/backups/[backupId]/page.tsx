import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Détail de Sauvegarde | ETHONE",
  description: "Inspectez le contenu, l'intégrité et la structure de votre snapshot.",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ backupId: "demo" }, { backupId: "backup-1" }];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « backups » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="backups" />;
}
