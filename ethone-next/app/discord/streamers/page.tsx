import StreamersCenterClient from "./StreamersCenterClient";

export const metadata = {
  title: "Alertes Streamers Twitch, YouTube & Kick | ETHONE",
  description: "Alertes en direct ultra-rapides pour Twitch, YouTube et Kick avec attribution automatique du rôle @En Live et embeds Discord animés.",
};

export default function StreamersPage() {
  return <StreamersCenterClient />;
}
