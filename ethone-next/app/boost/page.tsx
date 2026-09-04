import type { Metadata } from "next";
import BoostClient from "./BoostClient";

export const metadata: Metadata = {
  title: "Performance & Gaming Boost Hub — ETHONE OS",
  description: "Optimisation système, nettoyage RAM/CPU, mode Turbo et gestion des perks Discord Boost.",
};

export const dynamic = "force-static";

export default function BoostPage() {
  return <BoostClient />;
}
