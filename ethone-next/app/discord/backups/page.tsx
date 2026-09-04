import BackupsCenterClient from "./BackupsCenterClient";

export const metadata = {
  title: "Server Backup & Disaster Recovery | ETHONE",
  description: "Protect your server configuration and restore it when you need it.",
};

export default function BackupsPage() {
  return <BackupsCenterClient />;
}
