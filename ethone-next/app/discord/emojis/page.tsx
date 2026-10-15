import EmojiStudioClient from "./EmojiStudioClient";

export const metadata = {
  title: "Émojis du serveur | ETHONE",
  description: "Ajoute tes émojis (images ou GIF animés) sur ton serveur Discord en un glisser-déposer.",
};

export default function EmojisPage() {
  return <EmojiStudioClient />;
}
