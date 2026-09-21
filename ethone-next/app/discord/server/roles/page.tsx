import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Rôles & Hiérarchie — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerRolesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <ServerManagementClient initialTab="roles" />
    </Suspense>
  );
}
