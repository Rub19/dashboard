import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Analytics & Server Insights | ETHONE",
  description: "Métriques d'activité en direct, heatmaps et rétention communautaire.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function AnalyticsLegacyPage() {
  return <LegacyModuleRedirect module="analytics" />;
}
