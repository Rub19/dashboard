"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import DashboardOverview from "@/components/DashboardOverview";
import { useToast } from "@/components/ToastProvider";
import confetti from "canvas-confetti";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { success } = useToast();
  const hasThanked = useRef(false);

  useEffect(() => {
    if (hasThanked.current) return;
    if (searchParams?.get("supported") !== "true") return;

    hasThanked.current = true;

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.65 },
      colors: ["#10B981", "#06B6D4", "#F43F5E", "#F59E0B", "#FFFFFF"],
    });

    success("Merci pour votre précieux soutien à ETHONE OS ! ☕✨");

    window.history.replaceState(null, "", "/dashboard");
  }, [searchParams, success]);

  return <DashboardOverview />;
}
