import BotLanding from "@/components/botsite/BotLanding";

export const metadata = {
  title: "Etho — Le bot Discord de modération, sécurité et animation",
  description:
    "Modération, anti-raid, musique, économie, tickets et plus encore. Un bot Discord configurable depuis un dashboard synchronisé en direct.",
  openGraph: {
    title: "Etho — Le bot Discord qui gère votre serveur",
    description: "Modération, sécurité, musique, économie, tickets. Configuration depuis un dashboard synchronisé en direct.",
    images: ["/branding/etho-discord-banner.png"],
  },
};

export default function BotPage() {
  return <BotLanding />;
}
