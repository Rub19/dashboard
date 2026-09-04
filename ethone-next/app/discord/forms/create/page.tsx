import { Suspense } from "react";
import FormCreateClient from "./FormCreateClient";

export const dynamic = "force-static";

export default function FormCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Chargement de l'assistant de création...</p>
          </div>
        </div>
      }
    >
      <FormCreateClient />
    </Suspense>
  );
}
