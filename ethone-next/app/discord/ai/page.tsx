import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "AI Assistant | ETHONE",
  description: "Your server's intelligent assistant.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function AiLegacyPage() {
  return <LegacyModuleRedirect module="ai" />;
}
