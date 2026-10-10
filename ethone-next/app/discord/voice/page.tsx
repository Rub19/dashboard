import type { Metadata } from "next";
import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata: Metadata = {
  title: "Voice Channels — ETHONE",
  description: "Create, manage and automate your Discord voice experience.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function VoiceLegacyPage() {
  return <LegacyModuleRedirect module="voice" />;
}
