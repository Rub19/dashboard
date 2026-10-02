import { Suspense } from "react";
import FormResponsesClient from "./FormResponsesClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ formId: "demo" }, { formId: "staff-app" }, { formId: "partner-app" }];
}

export default function FormResponsesPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des réponses…" />}
    >
      <FormResponsesClient />
    </Suspense>
  );
}
