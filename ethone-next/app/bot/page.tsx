import BotLanding from "@/components/botsite/BotLanding";

export const metadata = {
  title: "Etho — Le bot Discord tout-en-un pour ta communauté",
  description:
    "Protection anti-raid, modération, musique, pont vocal Spotify et commandes fun. Tout ce dont ton serveur a besoin, sans superflu.",
  alternates: { canonical: "https://discord.ethone.dev/bot" },
  openGraph: {
    title: "Etho — Le bot Discord tout-en-un",
    description:
      "Protection anti-raid, modération avancée, musique, Spotify et commandes fun pour Discord.",
    url: "https://discord.ethone.dev/bot",
    siteName: "Etho",
    images: ["https://discord.ethone.dev/branding/etho-discord-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Etho — Le bot Discord tout-en-un",
    description: "Protection anti-raid, modération, musique et Spotify pour ton serveur Discord.",
    images: ["https://discord.ethone.dev/branding/etho-discord-banner.png"],
  },
};

export default function BotPage() {
  return <BotLanding />;
}
