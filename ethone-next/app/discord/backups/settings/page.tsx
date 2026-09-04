import BackupSettingsClient from "./BackupSettingsClient";

export const metadata = {
  title: "Paramètres de Sauvegarde & Rétention | ETHONE",
  description: "Planification automatique et politique de conservation des sauvegardes.",
};

export default function BackupSettingsPage() {
  return <BackupSettingsClient />;
}
