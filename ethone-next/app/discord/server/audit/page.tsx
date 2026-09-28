import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Journal d'Audit — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <ServerManagementClient initialTab="audit" />
    </Suspense>
  );
}
