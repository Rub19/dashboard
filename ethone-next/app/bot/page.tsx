import EthoProtectDashboard from "@/components/botsite/EthoProtectDashboard";

export const metadata = {
  title: "Etho Protect — Dashboard & Sécurité Discord",
  description:
    "Modération, anti-raid, musique, économie, tickets et plus encore. Dashboard de protection et gestion des serveurs Discord avec Etho Protect.",
  openGraph: {
    title: "Etho Protect — Dashboard Discord",
    description: "Protection anti-raid instantanée, modération avancée et gestion de vos serveurs Discord avec Etho Protect.",
    images: ["/branding/etho-discord-banner.png"],
  },
};

export default function BotPage() {
  return <EthoProtectDashboard />;
}
