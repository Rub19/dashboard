import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Comptage | ETHONE",
  description: "Jeu de comptage : les membres comptent 1, 2, 3… à tour de rôle dans un salon, avec record et classement.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function CountingLegacyPage() {
  return <LegacyModuleRedirect module="counting" />;
}
