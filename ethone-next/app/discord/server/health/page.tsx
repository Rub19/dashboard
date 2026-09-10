import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Diagnostic Santé — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerHealthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="health" />
    </Suspense>
  );
}
