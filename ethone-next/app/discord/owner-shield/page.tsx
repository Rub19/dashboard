"use client";

import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import OwnerShieldPanel from "@/components/discord/bot-control/OwnerShieldPanel";
import { notFound } from "next/navigation";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export default function DiscordOwnerShieldPage() {
  const { user, loading } = useAuth();
  const isOwner = Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (loading) {
    return (
      <ModuleSkeleton label="Chargement du Bouclier Owner…" />
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
