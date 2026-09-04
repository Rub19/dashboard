import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Paramètres Serveur — Server Management Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function ServerSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="settings" />
    </Suspense>
  );
}
