import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Membres — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerMembersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="members" />
    </Suspense>
  );
}
