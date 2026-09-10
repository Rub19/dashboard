import AfkCenterClient from "./AfkCenterClient";

export const metadata = {
  title: "AFK | ETHONE",
  description: "Statut absent : le bot prévient ceux qui mentionnent un membre AFK.",
};

export default function AfkPage() {
  return <AfkCenterClient />;
}
