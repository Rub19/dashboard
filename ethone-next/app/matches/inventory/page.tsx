"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import MatchesPage from "../page";

export default function MatchesInventoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isOwner = Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  useEffect(() => {
    if (!loading && !isOwner) {
      router.replace("/matches?tab=valorant");
    }
  }, [loading, isOwner, router]);

  if (!loading && !isOwner) {
    return <MatchesPage defaultTab="valorant" />;
  }

  return <MatchesPage defaultTab="valorant-inventory" />;
}

