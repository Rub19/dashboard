import { Suspense } from "react";
import ServerManagementClient from "./ServerManagementClient";

export const metadata = {
  title: "Server Management Center — ETHONE",
  description: "Centre de gestion globale du serveur Discord",
};

export const dynamic = "force-static";

export default function ServerManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <ServerManagementClient initialTab="overview" />
    </Suspense>
  );
}
