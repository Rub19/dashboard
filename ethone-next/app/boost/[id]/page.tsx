import type { Metadata } from "next";
import BoostClient from "../BoostClient";

export const metadata: Metadata = {
  title: "Performance & Gaming Boost Hub — ETHONE OS",
  description: "Optimisation système, nettoyage RAM/CPU, mode Turbo et gestion des perks Discord Boost.",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { id: "demo" },
    { id: "test-123" },
    { id: "turbo" },
    { id: "system" },
  ];
}

export default async function BoostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoostClient id={id} />;
}
