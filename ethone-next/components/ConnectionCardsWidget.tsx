"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import BentoCard from "@/components/BentoCard";
import Card3D from "@/components/Card3D";
import SafeImage from "@/components/SafeImage";
import EmptyState from "@/components/EmptyState";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { LiveRecord } from "@/lib/hooks/useLiveData";

const SERVICE_META: Record<string, { icon: string; label?: string }> = {
  nowplaying: { icon: "disc", label: "Spotify" },
  lanyard: { icon: "discord", label: "Discord" },
  weather: { icon: "cloud-sun", label: "Météo" },
  github: { icon: "github", label: "GitHub" },
  todoist: { icon: "circle-check", label: "Todoist" },
  youtube: { icon: "youtube", label: "YouTube" },
  reddit: { icon: "reddit", label: "Reddit" },
  lastfm: { icon: "music", label: "Last.fm" },
  twitch: { icon: "twitch", label: "Twitch" },
  minecraft: { icon: "gamepad-2", label: "Minecraft" },
  steam: { icon: "steam", label: "Steam" },
  "steam-achievements": { icon: "trophy", label: "Steam" },
  rss: { icon: "rss", label: "RSS" },
  bluesky: { icon: "bluesky", label: "Bluesky" },
  bills: { icon: "receipt", label: "Factures" },
  valorant: { icon: "target", label: "Valorant" },
  lol: { icon: "swords", label: "League" },
  "google-calendar": { icon: "calendar", label: "Calendar" },
  "google-drive": { icon: "hard-drive", label: "Drive" },
  notion: { icon: "notepad-text", label: "Notion" },
  tracker: { icon: "activity", label: "Tracker" },
  apex: { icon: "target", label: "Apex" },
};

function statusTone(status: LiveRecord["status"]) {
  switch (status) {
    case "connected":
      return { dot: "bg-[var(--success)]", ring: "ring-[var(--success)]/40" };
    case "loading":
      return { dot: "bg-[var(--info)] animate-pulse", ring: "ring-[var(--info)]/40" };
    case "error":
      return { dot: "bg-[var(--danger)]", ring: "ring-[var(--danger)]/40" };
    default:
      return { dot: "bg-[var(--text-muted)]/50", ring: "ring-[var(--text-muted)]/20" };
  }
}

export type ConnectionCardsWidgetProps = {
  records?: LiveRecord[];
  loading?: boolean;
  error?: Error | null;
  className?: string;
};

const ConnectionCardsWidget = memo(function ConnectionCardsWidget({
  records = [],
  loading,
  error: _error,
  className = "",
}: ConnectionCardsWidgetProps) {
  const i18n = useI18n();
  const router = useRouter();

  const filtered = useMemo(
    () => records.filter((r) => r.status !== "empty"),
    [records]
  );

  const handleOpen = () => router.push("/connections");

  const isEmpty = !loading && filtered.length === 0;

  return (
    <BentoCard
      title={i18n("services", "Services")}
      icon="plug"
      className={cn("h-full", className)}
      scrollable={false}
    >
      <div className="flex min-h-[88px] gap-2 overflow-x-auto no-scrollbar py-1">
        {loading && filtered.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 w-28 shrink-0 rounded-[var(--panel-radius)] v8-inset animate-pulse"
            />
          ))
        ) : isEmpty ? (
          <EmptyState
            kind="integration"
            compact
            inline
            className="min-h-[88px] w-full"
            actions={
              <Button size="sm" variant="outline" onClick={handleOpen} leftIcon={<Icon name="plug" className="h-4 w-4" />}>
                {i18n("connectService", "Connecter un service")}
              </Button>
            }
          />
        ) : (
          filtered.map((record) => {
            const meta = SERVICE_META[record.source] || { icon: "circle" };
            const tone = statusTone(record.status);
            return (
              <Card3D
                key={record.id}
                onClick={handleOpen}
                className="w-32 shrink-0 cursor-pointer p-2.5"
                style={{ minHeight: "5rem" }}
                radius="var(--panel-radius)"
              >
                <div className="flex h-full flex-col justify-between gap-1.5">
                  <div className="flex items-start justify-between">
                    {record.image ? (
                      <SafeImage
                        candidates={[record.image]}
                        alt={record.label}
                        size={28}
                        className="h-7 w-7 rounded-lg object-cover"
                        iconClassName="h-4 w-4 text-[var(--accent-primary)]"
                      />
                    ) : (
                      <Icon
                        name={meta.icon}
                        pack="phosphor"
                        className="h-5 w-5 text-[var(--accent-primary)]"
                      />
                    )}
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full ring-1 ring-offset-1 ring-offset-[var(--background)]",
                        tone.dot,
                        tone.ring
                      )}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                      {record.label}
                    </p>
                    <p className="truncate text-[9px] text-[var(--text-muted)]" title={record.title}>
                      {record.title}
                    </p>
                  </div>
                </div>
              </Card3D>
            );
          })
        )}
      </div>
    </BentoCard>
  );
});

export default ConnectionCardsWidget;
