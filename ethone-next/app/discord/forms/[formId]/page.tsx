import { Suspense } from "react";
import FormBuilderClient from "./FormBuilderClient";
import FormCreateClient from "../create/FormCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ formId: "demo" }, { formId: "staff-app" }, { formId: "partner-app" }];
}

export default function FormBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement du Form Builder...</p>
          </div>
        </div>
      }
    >
      <ChildRouter after="forms" routes={{ create: <FormCreateClient /> }}>
        <FormBuilderClient />
      </ChildRouter>
    </Suspense>
  );
}
