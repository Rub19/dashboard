import BackupCompareClient from "./BackupCompareClient";

export const metadata = {
  title: "Comparateur de Sauvegardes | ETHONE",
  description: "Comparez deux snapshots ou l'état en direct de votre serveur Discord.",
};

export default function BackupComparePage() {
  return <BackupCompareClient />;
}
