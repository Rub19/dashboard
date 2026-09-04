import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Salons — Server Management Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function ServerChannelsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="channels" />
    </Suspense>
  );
}
