import type { Metadata } from "next";
import VoiceRoomDetailClient from "./VoiceRoomDetailClient";

export const metadata: Metadata = {
  title: "Détail Salon Vocal — ETHONE",
  description: "Contrôle en direct, participants et timeline du salon temporaire Discord.",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ roomId: "demo" }, { roomId: "active-1" }];
}

export default async function VoiceRoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <VoiceRoomDetailClient roomId={roomId} />;
}
