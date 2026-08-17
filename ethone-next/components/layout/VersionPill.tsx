"use client";

import { ArrowUpCircle, GitCommit } from "lucide-react";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";
import { useI18n } from "@/lib/hooks/useI18n";

export default function VersionPill() {
  const i18n = useI18n();
  const { currentVersion, newVersion, hasUpdate } = useVersionChecker();

  const label = formatVersion(hasUpdate ? newVersion : currentVersion);
  const title = hasUpdate
    ? i18n("newVersionClickToReload", "Nouvelle version disponible, cliquez pour recharger")
    : i18n("currentVersion", "Version actuelle");

  return (
    <button
      type="button"
      onClick={() => (hasUpdate ? forceAppReload(newVersion) : undefined)}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-mono font-medium transition-all ${
        hasUpdate
          ? "cursor-pointer border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          : "border-white/[0.08] bg-white/[0.03] text-zinc-500"
      }`}
    >
      {hasUpdate ? (
        <ArrowUpCircle className="h-3 w-3 text-amber-400" />
      ) : (
        <GitCommit className="h-3 w-3 text-zinc-500" />
      )}
      <span>{label}</span>
    </button>
  );
}
