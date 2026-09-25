import StatrolesCenterClient from "./StatrolesCenterClient";

export const metadata = {
  title: "Statroles | ETHONE",
  description: "Rôles donnés et retirés automatiquement selon l'activité : messages, vocal, ancienneté.",
};

export default function StatrolesPage() {
  return <StatrolesCenterClient />;
}
