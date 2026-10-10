import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Mini-Jeux & Casino Communautaire | ETHONE",
  description: "Blackjack 21 interactif, Roulette Royale, Duels de dés PvP et cagnotte progressive Jackpot pour votre serveur Discord.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function GamesLegacyPage() {
  return <LegacyModuleRedirect module="games" />;
}
