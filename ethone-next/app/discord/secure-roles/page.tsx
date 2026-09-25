import SecureRolesCenterClient from "./SecureRolesCenterClient";

export const metadata = {
  title: "Rôles sécurisés | ETHONE",
  description: "Les permissions sensibles de votre équipe ne s'activent qu'après un code à usage unique.",
};

export default function SecureRolesPage() {
  return <SecureRolesCenterClient />;
}
