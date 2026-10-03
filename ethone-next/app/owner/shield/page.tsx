"use client";

import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import OwnerShieldPanel from "@/components/discord/bot-control/OwnerShieldPanel";
import { notFound } from "next/navigation";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export default function OwnerShieldPage() {
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
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <OwnerShieldPanel isOwner={true} />
      </div>
    </div>
  );
}
