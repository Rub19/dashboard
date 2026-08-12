"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";

export default function V8Breadcrumbs() {
  const i18n = useI18n();
  const pathname = usePathname();
  const parts = pathname === "/" ? ["home"] : pathname.split("/").filter(Boolean);

  return (
    <nav
      data-v8-breadcrumbs
      aria-label="Breadcrumb"
      className="v8-breadcrumbs hidden items-center gap-2 text-xs text-[var(--muted)] md:flex"
    >
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const href = i === 0 ? "/" : `/${parts.slice(0, i + 1).join("/")}/`;
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--border)]">/</span>}
            {isLast ? (
              <span className="capitalize text-[var(--foreground)]">{i18n(part) || part}</span>
            ) : (
              <Link href={href} className="capitalize hover:text-[var(--foreground)] hover:underline">
                {i18n(part) || part}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
