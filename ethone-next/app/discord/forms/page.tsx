import { Suspense } from "react";
import FormsCenterClient from "./FormsCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function FormsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de Forms & Applications…" />}
    >
      <FormsCenterClient />
    </Suspense>
  );
}
