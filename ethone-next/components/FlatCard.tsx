"use client";

import { memo, type ReactNode, type CSSProperties, type MouseEventHandler } from "react";
import { useSettings } from "./SettingsProvider";
import { cn } from "@/lib/utils";

function FlatCard({
  children,
  className = "",
  style,
  radius,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  radius?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  const { settings } = useSettings();

  return (
    <div
      onClick={onClick}
      className={cn(
        "v8-card min-w-0 overflow-hidden p-[var(--panel-padding)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--accent)]/30",
        className
      )}
      style={{
        borderRadius: radius || "var(--panel-radius)",
        boxShadow:
          settings.shadow === "glow"
            ? "var(--shadow)"
            : settings.shadow === "md"
              ? "0 4px 20px -4px rgba(0,0,0,0.3)"
              : settings.shadow === "sm"
                ? "0 1px 3px rgba(0,0,0,0.2)"
                : "none",
        ...style,
      }}
    >
      <div className="relative z-10 h-full w-full" data-card-style={settings.glassEnabled ? "glass" : "solid"}>
        {children}
      </div>
    </div>
  );
}

const MemoFlatCard = memo(FlatCard);
MemoFlatCard.displayName = "FlatCard";
export default MemoFlatCard;
