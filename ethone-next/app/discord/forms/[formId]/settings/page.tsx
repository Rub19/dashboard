import { Suspense } from "react";
import FormSettingsClient from "./FormSettingsClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ formId: "demo" }, { formId: "staff-app" }, { formId: "partner-app" }];
}

export default function FormSettingsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des paramètres du formulaire…" />}
    >
      <FormSettingsClient />
    </Suspense>
  );
}
