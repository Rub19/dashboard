import { Suspense } from "react";
import ServerManagementClient from "./ServerManagementClient";

export const metadata = {
  title: "Server Management Center 2.0 — ETHONE",
  description: "Centre de gestion globale du serveur Discord",
};

export const dynamic = "force-static";

export default function ServerManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="overview" />
    </Suspense>
  );
}
