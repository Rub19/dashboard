import AnalyticsCenterClient from "./AnalyticsCenterClient";

export const metadata = {
  title: "Analytics & Server Insights 2.0 | ETHONE",
  description: "Métriques d'activité en direct, heatmaps et rétention communautaire.",
};

export default function AnalyticsPage() {
  return <AnalyticsCenterClient />;
}
