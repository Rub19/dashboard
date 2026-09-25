import CountingCenterClient from "./CountingCenterClient";

export const metadata = {
  title: "Comptage | ETHONE",
  description: "Jeu de comptage : les membres comptent 1, 2, 3… à tour de rôle dans un salon, avec record et classement.",
};

export default function CountingPage() {
  return <CountingCenterClient />;
}
