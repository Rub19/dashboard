import type { Metadata } from "next";
import BrowserClient from "../BrowserClient";

export const metadata: Metadata = {
  title: "ETHONE Web Browser & Test Lab — ETHONE OS",
  description: "Navigateur intégré, inspection d'URL, audit CSP et environnement sandbox pour ETHONE OS.",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { id: "demo" },
    { id: "test-123" },
    { id: "google" },
    { id: "docs" },
  ];
}

export default async function BrowserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BrowserClient initialId={id} />;
}
