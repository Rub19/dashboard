import StarboardCenterClient from "./StarboardCenterClient";

export const metadata = {
  title: "Starboard | ETHONE",
  description: "Le hall of fame des messages les plus appréciés de votre serveur Discord.",
};

export default function StarboardPage() {
  return <StarboardCenterClient />;
}
