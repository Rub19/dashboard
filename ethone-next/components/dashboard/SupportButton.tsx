"use client";

import { memo } from "react";
import { Icon } from "@/lib/icons";
import { STRIPE_DONATION_URL } from "@/lib/env";
import { cn } from "@/lib/utils";

const SupportButton = memo(function SupportButton({
  className,
}: {
  className?: string;
}) {
  return (
    <a
      href={STRIPE_DONATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] px-3 py-2 text-xs font-medium text-[var(--text-muted)] backdrop-blur-md transition-all duration-200",
        "hover:border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] hover:shadow-[0_0_16px_var(--glow-color)]",
        className
      )}
      aria-label="Soutenir le projet"
    >
      <Icon name="coffee" className="h-4 w-4" />
      <span className="hidden 2xl:inline">Soutenir</span>
    </a>
  );
});

export default SupportButton;
