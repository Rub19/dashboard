import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Server Stats | ETHONE",
  description: "Salons compteurs : membres, boosts, en ligne… affichés dans le nom d'un salon.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function ServerStatsLegacyPage() {
  return <LegacyModuleRedirect module="serverstats" />;
}
