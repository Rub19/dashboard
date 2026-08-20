"use client";

import { memo, useEffect, useState } from "react";
import { Briefcase, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import Clock from "@/components/Clock";

function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

type StatusPillProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
};

function StatusPill({ icon, children, onClick, title }: StatusPillProps) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-[color,background-color,opacity] ${
        onClick ? "hover:bg-white/[0.06] hover:text-zinc-200 cursor-pointer" : ""
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </Component>
  );
}

function Separator() {
  return <span className="h-3 w-[1px] bg-white/10" />;
}

function SystemStatusPills() {
  const i18n = useI18n();
  const { activeProfile } = useActiveProfile();
  const { syncing, sync } = useActivityJournal();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", activeProfile?.workspace || "personal");
  const online = useOnlineStatus();

  const workspace = activeProfile?.workspace || activeSpace || "personal";
  const workspaceLabel = i18n(workspace) || workspace;

  const syncIcon = syncing ? (
    <RefreshCw className="h-3 w-3 animate-spin text-sky-400" />
  ) : online ? (
    <Cloud className="h-3 w-3 text-emerald-400" />
  ) : (
    <CloudOff className="h-3 w-3 text-rose-400" />
  );

  const syncLabel = syncing ? i18n("v8Syncing") || "Sync" : online ? i18n("v8Synced") || "Sync" : i18n("v8Offline") || "Offline";

  return (
    <div className="hidden items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 md:flex">
      <StatusPill icon={<Briefcase className="h-3 w-3 text-zinc-500" />} title={i18n("workspace")}>
        {workspaceLabel}
      </StatusPill>

      <Separator />

      <StatusPill
        icon={syncIcon}
        onClick={() => {
          if (!syncing) sync().catch(() => {});
        }}
        title={i18n("sync")}
      >
        {syncLabel}
      </StatusPill>

      <Separator />

      <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-400">
        <Clock />
      </div>
    </div>
  );
}

export default memo(SystemStatusPills);
