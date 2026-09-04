import type { Metadata } from "next";
import VoiceCenterClient from "./VoiceCenterClient";

export const metadata: Metadata = {
  title: "Voice Channels 2.0 — ETHONE",
  description: "Create, manage and automate your Discord voice experience.",
};

export const dynamic = "force-static";

export default function VoiceCenterPage() {
  return <VoiceCenterClient />;
}
