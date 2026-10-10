import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Statroles | ETHONE",
  description: "Rôles donnés et retirés automatiquement selon l'activité : messages, vocal, ancienneté.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function StatrolesLegacyPage() {
  return <LegacyModuleRedirect module="statroles" />;
}
