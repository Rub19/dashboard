import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Salons — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerChannelsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <ServerManagementClient initialTab="channels" />
    </Suspense>
  );
}
