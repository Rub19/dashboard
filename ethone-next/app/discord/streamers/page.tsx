import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Alertes Streamers Twitch, YouTube & Kick | ETHONE",
  description: "Alertes en direct ultra-rapides pour Twitch, YouTube et Kick avec attribution automatique du rôle @En Live et embeds Discord animés.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function StreamersLegacyPage() {
  return <LegacyModuleRedirect module="streamers" />;
}
