import BirthdaysCenterClient from "./BirthdaysCenterClient";

export const metadata = {
  title: "Birthdays | ETHONE",
  description: "Anniversaires des membres : annonce quotidienne + rôle du jour.",
};

export default function BirthdaysPage() {
  return <BirthdaysCenterClient />;
}
