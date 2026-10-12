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
    <div className="h-full min-h-0 w-full flex-1 overflow-y-auto os-scroll [overscroll-behavior:contain] px-4 py-6 pb-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <OwnerShieldPanel isOwner={true} />
      </div>
    </div>
  );
}
