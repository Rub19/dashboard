import { Suspense } from "react";
import FormCreateClient from "./FormCreateClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function FormCreatePage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de l'assistant de création…" />}
    >
      <FormCreateClient />
    </Suspense>
  );
}
