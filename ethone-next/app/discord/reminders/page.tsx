import RemindersCenterClient from "./RemindersCenterClient";

export const metadata = {
  title: "Reminders | ETHONE",
  description: "Programme des rappels personnels que le bot Discord t'envoie à l'échéance.",
};

export default function RemindersPage() {
  return <RemindersCenterClient />;
}
