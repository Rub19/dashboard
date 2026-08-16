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
      className={`group relative z-10 flex h-10 shrink-0 items-center !rounded-[var(--panel-radius)] transition-colors duration-150 duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        isActive
          ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
          : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
      }`}
      style={{
        width: expanded ? "100%" : 40,
        paddingLeft: expanded ? 12 : 0,
        paddingRight: expanded ? 12 : 0,
        justifyContent: expanded ? "flex-start" : "center",
        boxShadow: isActive ? "0 0 12px color-mix(in srgb, var(--accent) 15%, transparent)" : undefined,
      }}
    >
      <Icon name={icon} className="h-5 w-5 shrink-0" />
      <span
        className="whitespace-nowrap text-sm font-medium transition-colors duration-150 duration-300 ease-out"
        style={{
          maxWidth: expanded ? 180 : 0,
          opacity: expanded ? 1 : 0,
          marginLeft: expanded ? 12 : 0,
          overflow: "hidden",
        }}
      >
        {label}
      </span>
    </Link>
  );

  return (
    <div className="relative flex w-full items-center justify-start py-0.5">
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
          transition={{ duration: 0.15, ease: "easeOut" as const }}
        />
      )}
      {expanded ? link : <Tooltip label={label} position="right">{link}</Tooltip>}
    </div>
  );
}
