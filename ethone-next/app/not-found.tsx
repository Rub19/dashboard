"use client";

import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

export default function NotFound() {
  const i18n = useI18n();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12">
      <EmptyState
        icon="ghost"
        title={i18n("notFoundTitle")}
        description={i18n("notFoundBack")}
        actions={
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Icon name="home" className="h-4 w-4" />
            {i18n("notFoundBack")}
          </Link>
        }
      />
    </div>
  );
}
