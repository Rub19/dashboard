import ServerStatsCenterClient from "./ServerStatsCenterClient";

export const metadata = {
  title: "Server Stats | ETHONE",
  description: "Salons compteurs : membres, boosts, en ligne… affichés dans le nom d'un salon.",
};

export default function ServerStatsPage() {
  return <ServerStatsCenterClient />;
}
