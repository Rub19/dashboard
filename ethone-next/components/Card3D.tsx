"use client";

import { memo, type ReactNode, type CSSProperties } from "react";
import { useSettings } from "./SettingsProvider";

function Card3D({
  children,
  className = "",
  style,
  radius,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  radius?: string;
}) {
  const { settings } = useSettings();

  return (
    <div
      className={`v8-card min-w-0 overflow-hidden p-[var(--panel-padding)] transition-colors duration-150 hover:border-[var(--accent)]/30 ${className}`}
      data-card-style={settings.glassEnabled ? "glass" : "solid"}
      style={{
        borderRadius: radius || "var(--panel-radius)",
        boxShadow: settings.shadow === "glow" ? "var(--shadow)" : settings.shadow === "md" ? "0 4px 20px -4px rgba(0,0,0,0.3)" : settings.shadow === "sm" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
        ...style,
      }}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default memo(Card3D);
