import type { Metadata } from "next";
import BrowserClient from "./BrowserClient";

export const metadata: Metadata = {
  title: "ETHONE Web Browser & Test Lab — ETHONE OS",
  description: "Navigateur intégré, inspection d'URL, audit CSP et environnement sandbox pour ETHONE OS.",
};

export const dynamic = "force-static";

export default function BrowserPage() {
  return <BrowserClient />;
}
