import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Reaction Roles & Auto-Roles | ETHONE",
  description: "Panneaux de rôles par boutons, join-roles et temporisation.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function RolesLegacyPage() {
  return <LegacyModuleRedirect module="roles" />;
}
