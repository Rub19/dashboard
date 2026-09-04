import { Suspense } from "react";
import ServerManagementClient from "../../ServerManagementClient";

export const metadata = {
  title: "Salon — Server Management Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { channelId: "c-1" },
    { channelId: "c-2" },
    { channelId: "c-4" },
    { channelId: "demo" },
  ];
}

export default async function ChannelDetailPage({ params }: { params: Promise<{ channelId: string }> }) {
  const resolved = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ServerManagementClient initialTab="channels" openedChannelId={resolved.channelId} />
    </Suspense>
  );
}
