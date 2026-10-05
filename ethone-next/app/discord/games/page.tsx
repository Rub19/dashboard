import GamesCenterClient from "./GamesCenterClient";

export const metadata = {
  title: "Mini-Jeux & Casino Communautaire | ETHONE",
  description: "Blackjack 21 interactif, Roulette Royale, Duels de dés PvP et cagnotte progressive Jackpot pour votre serveur Discord.",
};

export default function GamesPage() {
  return <GamesCenterClient />;
}
