"use client";

import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettingsDangerZoneProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function SettingsDangerZone({
  title = "Zone de danger",
  description = "Ces actions sont irréversibles ou modifient profondément vos données locales.",
  children,
  className,
}: SettingsDangerZoneProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 sm:p-5 transition-all",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[var(--danger)]">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
      </div>
      {description && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex flex-col divide-y divide-[var(--danger)]/15 pt-2">
        {children}
      </div>
    </div>
  );
}
