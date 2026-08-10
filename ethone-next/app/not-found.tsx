"use client";

import Link from "next/link";
import { Ghost, Home } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

export default function NotFound() {
  const i18n = useI18n();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface-raised)] text-[var(--accent)]">
        <Ghost className="h-10 w-10" />
      </div>
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-8 max-w-sm text-[var(--muted)]">
        {i18n("notFound")}
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        {i18n("home")}
      </Link>
    </div>
  );
}
