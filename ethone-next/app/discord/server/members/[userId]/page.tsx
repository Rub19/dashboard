import { Suspense } from "react";
import ServerManagementClient from "../../ServerManagementClient";

export const metadata = {
  title: "Profil Membre — Server Management Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { userId: "1234567890" },
    { userId: "2345678901" },
    { userId: "3456789012" },
    { userId: "demo" },
  ];
}

export default async function MemberDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolved = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="members" openedMemberId={resolved.userId} />
    </Suspense>
  );
}
