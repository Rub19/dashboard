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
  tooltip?: string;
  onClick?: () => void;
};

export default function SidebarItem({ href, icon, label, isActive, tooltip, onClick }: SidebarItemProps) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      data-tooltip={tooltip}
      data-haptic
      className={`relative z-10 flex h-10 w-10 items-center justify-center !rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
          : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
      }`}
      style={isActive ? { boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 20%, transparent)" } : undefined}
    >
      <Icon name={icon} className="h-5 w-5 shrink-0" />
    </Link>
  );

  return (
    <div className="relative flex w-full items-center justify-center py-0.5">
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {tooltip ? (
        <Tooltip label={tooltip} position="right">
          {link}
        </Tooltip>
      ) : (
        link
      )}
    </div>
  );
}
