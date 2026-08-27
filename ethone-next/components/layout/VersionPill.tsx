"use client";

import { ArrowUpCircle, Tag } from "lucide-react";
import { useVersionChecker, type VersionData } from "@/lib/hooks/useVersionChecker";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";

function formatBuildInfo(data: { commit?: string | null; buildAt?: string } | null): string {
  if (!data) return "";
  const parts: string[] = [];
  if (data.commit) parts.push(`#${data.commit.slice(0, 7)}`);
  if (data.buildAt) {
    try {
      const d = new Date(data.buildAt);
      parts.push(d.toLocaleDateString());
      parts.push(d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    } catch {}
  }
  return parts.join(" · ");
}

function isDifferentBuild(a: VersionData | null, b: VersionData | null): boolean {
  if (!a || !b) return false;
  if (a.version !== b.version) return true;
  if (a.commit !== b.commit) return true;
  if (a.buildAt !== b.buildAt) return true;
  return false;
}

export default function VersionPill() {
  const i18n = useI18n();
  const { show } = useToast();
  const { currentData, newData, hasUpdate } = useVersionChecker();

  const showUpdate = hasUpdate || isDifferentBuild(currentData, newData);
  const data = newData ?? currentData;
  const label = formatVersion(data?.version ?? null);
  const buildInfo = formatBuildInfo(data) || i18n("noBuildInfo", "Aucune information de build");
  const title =
    (showUpdate
      ? i18n("newVersionClickToReload", "Nouvelle version disponible, cliquez pour recharger")
      : i18n("currentVersion", "Version actuelle")) + (formatBuildInfo(data) ? ` — ${formatBuildInfo(data)}` : "");

  function handleClick() {
    if (showUpdate) {
      forceAppReload(data?.version ?? null, data);
      return;
    }
    show({
      type: "info",
      title: i18n("currentVersion", "Version actuelle"),
      description: `${label} · ${buildInfo}`,
      icon: <Tag className="h-5 w-5 text-emerald-400" />,
      duration: 3500,
      dedupKey: "current-version-toast",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-mono font-medium transition-all ${
        showUpdate
          ? "cursor-pointer border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.04]"
      }`}
    >
      {showUpdate ? (
        <ArrowUpCircle className="h-3 w-3 text-amber-400" />
      ) : (
        <Tag className="h-3 w-3 text-[var(--text-muted)]" />
      )}
      <span>{label}</span>
    </button>
  );
}
