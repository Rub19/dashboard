import { Suspense } from "react";
import InviteUserDetailClient from "./InviteUserDetailClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ userId: "demo" }, { userId: "top" }];
}

export default function InviteUserPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du profil de parrainage…" />}
    >
      <InviteUserDetailClient />
    </Suspense>
  );
}
