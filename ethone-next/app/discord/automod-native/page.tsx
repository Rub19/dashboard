import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "AutoMod natif | ETHONE",
  description: "Gère les règles AutoMod natives de Discord, exécutées par Discord même si le bot est hors ligne.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function AutomodNativeLegacyPage() {
  return <LegacyModuleRedirect module="automodnative" />;
}
