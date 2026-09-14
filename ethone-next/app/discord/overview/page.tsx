import OverviewClient from "./OverviewClient";

export const metadata = {
  title: "Vue d'ensemble | ETHONE",
  description: "État en direct du bot, de la modération, de la musique, des tickets et plus, pour ce serveur.",
};

export default function OverviewPage() {
  return <OverviewClient />;
}
