"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MatchesPage from "../matches/page";

function TrackerContent() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "valorant";
  return <MatchesPage defaultTab={tab} />;
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<MatchesPage defaultTab="valorant" />}>
      <TrackerContent />
    </Suspense>
  );
}
