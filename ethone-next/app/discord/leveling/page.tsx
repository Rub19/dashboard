import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Leveling & Rôles XP | ETHONE",
  description: "Progression communautaire, leaderboard dynamique et récompenses de rôles.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function LevelingLegacyPage() {
  return <LegacyModuleRedirect module="leveling" />;
}
