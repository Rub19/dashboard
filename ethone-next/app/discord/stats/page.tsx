import StatsCenterClient from "./StatsCenterClient";

export const metadata = {
  title: "Statistiques | ETHONE",
  description: "Messages et vocal par jour, membres, salons et classements, avec graphiques.",
};

export default function StatsPage() {
  return <StatsCenterClient />;
}
