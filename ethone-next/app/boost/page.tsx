import type { Metadata } from "next";
import BoostClient from "./BoostClient";

export const metadata: Metadata = {
  title: "Performance de l'appareil — ETHONE",
  description: "Mesures réelles de votre navigateur (fluidité, mémoire, réseau) et nettoyage du cache de l'application.",
};

export const dynamic = "force-static";

export default function BoostPage() {
  return <BoostClient />;
}
