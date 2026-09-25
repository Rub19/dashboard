import SettingsCenterClient from "./SettingsCenterClient";

export const metadata = {
  title: "Paramètres | ETHONE",
  description: "Langue, fuseau horaire, contacts d'urgence et commandes du bot sur votre serveur.",
};

export default function SettingsPage() {
  return <SettingsCenterClient />;
}
