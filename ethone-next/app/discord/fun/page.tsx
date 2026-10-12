import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Fun & Médias — Divertissement Discord | ETHONE",
  description: "Suite de divertissement Discord : paroles de chansons, citations, recherche d'images, films, séries TV et fiches de jeux vidéo.",
};

export default function FunLegacyPage() {
  return <LegacyModuleRedirect module="fun" />;
}
