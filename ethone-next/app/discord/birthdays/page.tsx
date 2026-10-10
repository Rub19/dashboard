import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Birthdays | ETHONE",
  description: "Anniversaires des membres : annonce quotidienne + rôle du jour.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function BirthdaysLegacyPage() {
  return <LegacyModuleRedirect module="birthdays" />;
}
