import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Profil Membre — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { userId: "1234567890" },
    { userId: "2345678901" },
    { userId: "3456789012" },
    { userId: "demo" },
  ];
}

/** Ancien onglet de la gestion du serveur : le module Serveur s'ouvre maintenant dans la console. */
export default function ServerLegacyPage() {
  return <LegacyModuleRedirect module="server" />;
}
