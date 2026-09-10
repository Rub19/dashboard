import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Permissions & Debugger — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerPermissionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="permissions" />
    </Suspense>
  );
}
