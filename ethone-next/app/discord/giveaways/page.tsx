import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Giveaways & Tirages | ETHONE",
  description: "Concours Discord automatisés avec conditions d'éligibilité et tirage au sort sécurisé.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function GiveawaysLegacyPage() {
  return <LegacyModuleRedirect module="giveaways" />;
}
