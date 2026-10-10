import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function ModerationLegacyPage() {
  return <LegacyModuleRedirect module="moderation" />;
}
