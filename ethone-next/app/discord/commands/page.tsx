import CommandsCenterClient from "./CommandsCenterClient";

export const metadata = {
  title: "Command Studio & Builder 2.0 | ETHONE",
  description: "Créateur no-code de commandes Discord, embeds riches et simulateur live.",
};

export default function CommandsPage() {
  return <CommandsCenterClient />;
}
