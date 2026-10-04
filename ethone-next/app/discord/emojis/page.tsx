import EmojiStudioClient from "./EmojiStudioClient";

export const metadata = {
  title: "Émojis du serveur | ETHONE",
  description: "Ajoutez vos émojis (images ou GIF animés) sur votre serveur Discord en un glisser-déposer.",
};

export default function EmojisPage() {
  return <EmojiStudioClient />;
}
