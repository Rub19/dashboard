import BotLanding from "@/components/botsite/BotLanding";

export const metadata = {
  title: "Etho — Le bot Discord tout-en-un pour votre communauté",
  description:
    "Protection anti-raid, modération rapide, musique, pont vocal Spotify et commandes fun. Tout ce dont votre serveur a besoin, sans superflu.",
  openGraph: {
    title: "Etho — Le bot Discord tout-en-un",
    description:
      "Protection anti-raid, modération avancée, musique, Spotify et commandes fun pour Discord.",
    images: ["/branding/etho-discord-banner.png"],
  },
};

export default function BotPage() {
  return <BotLanding />;
}
