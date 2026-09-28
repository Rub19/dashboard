import { Suspense } from "react";
import InviteUserDetailClient from "./InviteUserDetailClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ userId: "demo" }, { userId: "top" }];
}

export default function InviteUserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement du profil de parrainage...</p>
          </div>
        </div>
      }
    >
      <InviteUserDetailClient />
    </Suspense>
  );
}
