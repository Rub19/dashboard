import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Starboard | ETHONE",
  description: "Le hall of fame des messages les plus appréciés de votre serveur Discord.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function StarboardLegacyPage() {
  return <LegacyModuleRedirect module="starboard" />;
}
