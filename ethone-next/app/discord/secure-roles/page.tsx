import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Rôles sécurisés | ETHONE",
  description: "Les permissions sensibles de votre équipe ne s'activent qu'après un code à usage unique.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function SecureRolesLegacyPage() {
  return <LegacyModuleRedirect module="secureroles" />;
}
