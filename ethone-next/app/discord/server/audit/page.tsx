import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Journal d'Audit — Server Management Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function ServerAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="audit" />
    </Suspense>
  );
}
