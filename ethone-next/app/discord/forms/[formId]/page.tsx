import { Suspense } from "react";
import FormBuilderClient from "./FormBuilderClient";
import FormCreateClient from "../create/FormCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ formId: "demo" }, { formId: "staff-app" }, { formId: "partner-app" }];
}

export default function FormBuilderPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du Form Builder…" />}
    >
      <ChildRouter after="forms" routes={{ create: <FormCreateClient /> }}>
        <FormBuilderClient />
      </ChildRouter>
    </Suspense>
  );
}
