import AnalyticsCenterClient from "./AnalyticsCenterClient";

export const metadata = {
  title: "Analytics & Server Insights | ETHONE",
  description: "Métriques d'activité en direct, heatmaps et rétention communautaire.",
};

export default function AnalyticsPage() {
  return <AnalyticsCenterClient />;
}
