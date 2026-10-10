import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "AFK | ETHONE",
  description: "Statut absent : le bot prévient ceux qui mentionnent un membre AFK.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function AfkLegacyPage() {
  return <LegacyModuleRedirect module="afk" />;
}
