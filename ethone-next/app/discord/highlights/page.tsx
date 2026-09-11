import HighlightsCenterClient from "./HighlightsCenterClient";

export const metadata = {
  title: "Highlights | ETHONE",
  description: "Mots-clés surveillés : reçois un DM quand quelqu'un les mentionne dans le serveur.",
};

export default function HighlightsPage() {
  return <HighlightsCenterClient />;
}
