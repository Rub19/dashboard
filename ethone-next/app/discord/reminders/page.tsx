import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Reminders | ETHONE",
  description: "Programme des rappels personnels que le bot Discord t'envoie à l'échéance.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function RemindersLegacyPage() {
  return <LegacyModuleRedirect module="reminders" />;
}
