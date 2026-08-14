"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import Tooltip from "@/components/Tooltip";

type SidebarItemProps = {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
  expanded?: boolean;
  onClick?: () => void;
};

export default function SidebarItem({
  href,
  icon,
  label,
  isActive,
  expanded = false,
  onClick,
}: SidebarItemProps) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      data-tooltip={expanded ? undefined : label}
      data-haptic
      className={`group relative z-10 flex h-10 shrink-0 items-center !rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        expanded ? "w-full gap-3.5 px-3 py-2.5" : "w-10 justify-center"
      } ${
        isActive
          ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
          : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
      }`}
      style={isActive ? { boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 15%, transparent)" } : undefined}
    >
      <Icon name={icon} className="h-5 w-5 shrink-0" />
      <span
        className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
          expanded ? "opacity-100 translate-x-0 delay-100" : "opacity-0 pointer-events-none translate-x-2 w-0"
        }`}
      >
        {label}
      </span>
    </Link>
  );

  return (
    <div className={`relative flex w-full items-center py-0.5 ${expanded ? "justify-start" : "justify-center"}`}>
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {expanded ? link : <Tooltip label={label} position="right">{link}</Tooltip>}
    </div>
  );
}
