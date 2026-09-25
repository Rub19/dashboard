import { Suspense } from "react";
import BackupDetailClient from "./BackupDetailClient";
import BackupCompareClient from "../compare/BackupCompareClient";
import BackupSettingsClient from "../settings/BackupSettingsClient";
import ChildRouter from "@/components/discord/ChildRouter";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ backupId: "demo" }, { backupId: "backup-1" }];
}

export const metadata = {
  title: "Détail de Sauvegarde | ETHONE",
  description: "Inspectez le contenu, l'intégrité et la structure de votre snapshot.",
};

export default function BackupDetailPage() {
  return (
    <Suspense fallback={null}>
      <ChildRouter after="backups" routes={{ compare: <BackupCompareClient />, settings: <BackupSettingsClient /> }}>
        <BackupDetailClient />
      </ChildRouter>
    </Suspense>
  );
}
