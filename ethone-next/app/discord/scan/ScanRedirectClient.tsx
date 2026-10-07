"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ScanRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const guildId = searchParams.get("guildId");
    if (guildId) {
      router.replace(`/discord?guildId=${guildId}&view=scan`);
    } else {
      router.replace("/discord?view=scan");
    }
  }, [router, searchParams]);

  return <div className="min-h-screen" />;
}
