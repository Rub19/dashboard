import SuggestionsCenterClient from "./SuggestionsCenterClient";

export const metadata = {
  title: "Boîte à Suggestions 2.0 | ETHONE",
  description: "Idées communautaires, votes interactifs et Kanban de réponse staff.",
};

export default function SuggestionsPage() {
  return <SuggestionsCenterClient />;
}
