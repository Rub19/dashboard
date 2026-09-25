import { Suspense } from "react";
import ServerManagementClient from "../ServerManagementClient";

export const metadata = {
  title: "Emojis & Stickers — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

export default function ServerEmojisPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
      <ServerManagementClient initialTab="emojis" />
    </Suspense>
  );
}
