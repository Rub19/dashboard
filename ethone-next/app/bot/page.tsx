"use client";

import { useEffect } from "react";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export default function BotPage() {
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    window.location.replace(`/discord${search}`);
  }, []);

  return <ModuleSkeleton label="Ouverture de la console Discord…" />;
}
