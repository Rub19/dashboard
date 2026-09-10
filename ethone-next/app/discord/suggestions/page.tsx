import SuggestionsCenterClient from "./SuggestionsCenterClient";

export const metadata = {
  title: "Boîte à Suggestions | ETHONE",
  description: "Idées communautaires, votes interactifs et Kanban de réponse staff.",
};

export default function SuggestionsPage() {
  return <SuggestionsCenterClient />;
}
