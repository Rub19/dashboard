import BotLogin from "@/components/botsite/BotLogin";

export const metadata = {
  title: "Connexion — Etho",
  description: "Connecte-toi avec Discord pour configurer Etho sur tes serveurs.",
  alternates: { canonical: "https://discord.ethone.dev/bot/connexion" },
  robots: { index: false },
};

export default function BotLoginPage() {
  return <BotLogin />;
}
