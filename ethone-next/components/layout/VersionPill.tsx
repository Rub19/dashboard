"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, Tag } from "@/components/icons/ph";
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
  if (!a.buildAt || !b.buildAt) return false;
  return a.buildAt !== b.buildAt;
}

export default function VersionPill() {
  const [mounted, setMounted] = useState(false);
  const i18n = useI18n();
  const { show } = useToast();
  const { currentData, newData, hasUpdate } = useVersionChecker();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const fallbackVersion = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BUILD_VERSION : null;
    const initialLabel = formatVersion(fallbackVersion ?? null);
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-mono font-medium transition-all bg-transparent text-[var(--text-muted)]"
      >
        <Tag className="h-3 w-3 text-[var(--text-muted)]" />
        <span>{initialLabel || "—"}</span>
      </button>
    );
  }

  const showUpdate = hasUpdate || isDifferentBuild(currentData, newData);
  const data = (showUpdate && newData ? newData : currentData) ?? newData ?? currentData;
  const fallbackVersion = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BUILD_VERSION : null;
  const label = formatVersion(data?.version ?? fallbackVersion ?? null);
  const buildInfo = formatBuildInfo(data) || i18n("noBuildInfo", "Aucune information de build");
  const title =
    (showUpdate
      ? i18n("newVersionClickToReload", "Nouvelle version disponible, cliquez pour recharger")
      : i18n("currentVersion", "Version actuelle")) + (formatBuildInfo(data) ? ` — ${formatBuildInfo(data)}` : "");

  function handleClick() {
    if (showUpdate) {
      forceAppReload(newData?.version ?? data?.version ?? null, newData ?? data);
      return;
    }
    show({
      type: "info",
      variant: "version",
      title: i18n("currentVersion", "Version actuelle"),
      description: `${label} · ${buildInfo}`,
      icon: <Tag className="h-5 w-5" />,
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
