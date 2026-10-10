import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Server Backup & Disaster Recovery | ETHONE",
  description: "Protect your server configuration and restore it when you need it.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function BackupsLegacyPage() {
  return <LegacyModuleRedirect module="backups" />;
}
