import { Suspense } from "react";
import ScanRedirectClient from "./ScanRedirectClient";

export const metadata = {
  title: "Scan de sécurité — ETHONE",
  description: "Rapport et diagnostic complet de sécurité pour votre serveur Discord.",
};

export const dynamic = "force-static";

export default function DiscordScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ScanRedirectClient />
    </Suspense>
  );
}
