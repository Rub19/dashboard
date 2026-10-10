import type { Metadata } from "next";
import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata: Metadata = {
  title: "Détail Salon Vocal — ETHONE",
  description: "Contrôle en direct, participants et timeline du salon temporaire Discord.",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { roomId: "demo" },
    { roomId: "active-1" },
    { roomId: "room_chill_lounge" },
    { roomId: "room_alex_gaming" },
  ];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « voice » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="voice" />;
}
