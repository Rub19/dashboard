import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Paramètres Serveur — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
      <ServerManagementClient initialTab="settings" />
    </Suspense>
  );
}
