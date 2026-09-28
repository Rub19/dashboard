"use client";

import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import OwnerShieldPanel from "@/components/discord/bot-control/OwnerShieldPanel";
import { notFound } from "next/navigation";

export default function DiscordOwnerShieldPage() {
  const { user, loading } = useAuth();
  const isOwner = Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!isOwner) {
    notFound();
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <OwnerShieldPanel isOwner={true} />
      </div>
    </div>
  );
}
