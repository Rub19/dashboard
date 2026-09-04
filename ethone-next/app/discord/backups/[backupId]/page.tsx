import BackupDetailClient from "./BackupDetailClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ backupId: "demo" }, { backupId: "backup-1" }];
}

export const metadata = {
  title: "Détail de Sauvegarde | ETHONE",
  description: "Inspectez le contenu, l'intégrité et la structure de votre snapshot.",
};

export default function BackupDetailPage() {
  return <BackupDetailClient />;
}
