import type { Metadata } from "next";
import VoiceSettingsClient from "./VoiceSettingsClient";

export const metadata: Metadata = {
  title: "Paramètres Salons Vocaux — ETHONE",
  description: "Configuration du Join-to-Create, délais de suppression, permissions et automatisation.",
};

export const dynamic = "force-static";

export default function VoiceSettingsPage() {
  return <VoiceSettingsClient />;
}
