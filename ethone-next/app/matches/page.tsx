"use client";

import { useState, useMemo } from "react";
import { useTracker, type TrackerGame, type TrackerPlayer } from "@/lib/hooks/useTracker";
import FlatCard from "@/components/FlatCard";
import LiquidSidebar from "@/components/LiquidSidebar";
import ValorantTrackerView from "@/components/tracker/ValorantTrackerView";
import LolTrackerView from "@/components/tracker/LolTrackerView";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
import Button from "@/components/ui/Button";
import { useSettings } from "@/components/SettingsProvider";
import { Swords, Gamepad2, Shield } from "lucide-react";

const tabs = [
  { id: "valorant", label: "Valorant", icon: <Swords className="h-4 w-4" /> },
  { id: "lol", label: "League of Legends", icon: <Shield className="h-4 w-4" /> },
  { id: "apex", label: "Apex Legends", icon: <Gamepad2 className="h-4 w-4" /> },
];

const APEX_PLATFORMS = ["origin", "xbl", "psn"] as const;

export default function MatchesPage() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState("valorant");
  const [name, setName] = useState(settings.liveTrackerRiotName);
  const [tag, setTag] = useState(settings.liveTrackerRiotTag);
  const [apexPlatform, setApexPlatform] = useState<"origin" | "xbl" | "psn">(settings.liveTrackerApexPlatform || "origin");
  const [apexIdentifier, setApexIdentifier] = useState(settings.liveTrackerApexIdentifier);

  const path = useMemo(() => {
    if (tab === "apex") {
      if (!settings.liveTrackerApexIdentifier) return "";
      return `/api/stats/apex-matches?platform=${encodeURIComponent(settings.liveTrackerApexPlatform)}&identifier=${encodeURIComponent(settings.liveTrackerApexIdentifier)}&mode=all`;
    }
    if (tab === "lol") {
      if (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) return "";
      return `/api/stats/lol-matches?name=${encodeURIComponent(settings.liveTrackerRiotName)}&tag=${encodeURIComponent(settings.liveTrackerRiotTag)}`;
    }
    return "";
  }, [
    tab,
    settings.liveTrackerRiotName,
    settings.liveTrackerRiotTag,
    settings.liveTrackerApexPlatform,
    settings.liveTrackerApexIdentifier,
  ]);

  const trackerKind = tab === "apex" ? "tracker-apex" : "tracker-lol";
  const { items, loading, syncing, sync } = useTracker(path, trackerKind);

  return (
    <div className="h-full min-h-0 w-full flex overflow-hidden gap-4 p-2 sm:p-4">
      {/* Liquid Sidebar for switching games */}
      <LiquidSidebar
        items={tabs}
        defaultActive="valorant"
        active={tab}
        onChange={setTab}
      />

      {/* Main Workspace Area */}
      <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">
        {tab === "valorant" ? (
          <ValorantTrackerView />
        ) : tab === "lol" ? (
          <LolTrackerView />
        ) : (
          <div className="h-full min-h-0 w-full flex flex-col overflow-hidden space-y-4">
            <div className="shrink-0 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h1 className="min-w-0 truncate text-2xl font-bold">{i18n("matchesTitle")}</h1>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sync();
                      success(i18n("synced"));
                    } catch {
                      showError(i18n("error"));
                    }
                  }}
                  disabled={syncing}
                  className="flex shrink-0 items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]/20 disabled:opacity-50"
                >
                  <Icon name="refresh-cw" className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {i18n("sync")}
                </button>
              </div>

              {tab === "apex" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="apex-platform" className="mb-1 block text-xs text-[var(--muted)]">{i18n("platform")}</label>
                    <Select
                      id="apex-platform"
                      value={apexPlatform}
                      onChange={(value) => setApexPlatform(value as typeof apexPlatform)}
                      options={APEX_PLATFORMS.map((p) => ({
                        id: p,
                        label: p === "origin" ? "Origin (PC)" : p === "xbl" ? "Xbox Live" : "PlayStation Network",
                      }))}
                      className="w-full"
                    />
                  </div>
                  <FormField label={i18n("liveTrackerApexIdentifier")} className="min-w-0 flex-1">
                    <Input
                      id="apex-identifier"
                      type="text"
                      value={apexIdentifier}
                      onChange={(e) => setApexIdentifier(e.target.value)}
                      placeholder={i18n("liveTrackerApexIdentifier")}
                      className="w-full"
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => update({ liveTrackerApexPlatform: apexPlatform, liveTrackerApexIdentifier: apexIdentifier })}
                    className="shrink-0"
                  >
                    {i18n("apply")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <FormField label={i18n("liveTrackerRiotName")} className="min-w-0 flex-1">
                    <Input
                      id="riot-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={i18n("liveTrackerRiotName")}
                      className="w-full"
                    />
                  </FormField>
                  <FormField label={i18n("liveTrackerRiotTag")} className="min-w-0 flex-1">
                    <Input
                      id="riot-tag"
                      type="text"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="#1234"
                      className="w-full"
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => update({ liveTrackerRiotName: name, liveTrackerRiotTag: tag })}
                    className="shrink-0"
                  >
                    {i18n("apply")}
                  </Button>
                </div>
              )}
            </div>

            <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-4">
              {loading && !items ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-[var(--panel-radius)] bg-[var(--border)]" />
                  <div className="h-20 animate-pulse rounded-[var(--panel-radius)] bg-[var(--border)]" />
                </div>
              ) : items && items.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((match, i) => (
                    <FlatCard key={match.id || i}>
                      <div className="space-y-2">
                        <p className="font-bold text-white">{match.map || match.mode || "Match"}</p>
                        <p className="text-xs text-zinc-400 font-mono">{match.kills ?? "-"}/{match.deaths ?? "-"}/{match.assists ?? "-"}</p>
                      </div>
                    </FlatCard>
                  ))}
                </div>
              ) : (
                <FlatCard>
                  <p className="text-sm text-[var(--muted)]">{i18n("noMatches")}</p>
                </FlatCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
