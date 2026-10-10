import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Sticky Messages | ETHONE",
  description: "Garde un message important toujours visible en bas d'un salon Discord.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function StickyLegacyPage() {
  return <LegacyModuleRedirect module="sticky" />;
}
