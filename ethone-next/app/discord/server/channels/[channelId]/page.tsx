import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Salon — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { channelId: "c-1" },
    { channelId: "c-2" },
    { channelId: "c-4" },
    { channelId: "demo" },
  ];
}

/** Ancien onglet de la gestion du serveur : le module Serveur s'ouvre maintenant dans la console. */
export default function ServerLegacyPage() {
  return <LegacyModuleRedirect module="server" />;
}
