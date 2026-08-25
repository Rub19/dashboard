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

const SERVICE_META: Record<string, { icon: string; label?: string; category: string }> = {
  nowplaying: { icon: "disc", label: "Spotify", category: "media" },
  lanyard: { icon: "discord", label: "Discord", category: "social" },
  weather: { icon: "cloud-sun", label: "Météo", category: "info" },
  github: { icon: "github", label: "GitHub", category: "development" },
  todoist: { icon: "circle-check", label: "Todoist", category: "productivity" },
  youtube: { icon: "youtube", label: "YouTube", category: "media" },
  reddit: { icon: "reddit", label: "Reddit", category: "social" },
  lastfm: { icon: "music", label: "Last.fm", category: "media" },
  twitch: { icon: "twitch", label: "Twitch", category: "media" },
  minecraft: { icon: "gamepad-2", label: "Minecraft", category: "gaming" },
  steam: { icon: "steam", label: "Steam", category: "gaming" },
  "steam-achievements": { icon: "trophy", label: "Steam", category: "gaming" },
  rss: { icon: "rss", label: "RSS", category: "info" },
  bluesky: { icon: "bluesky", label: "Bluesky", category: "social" },
  bills: { icon: "receipt", label: "Factures", category: "productivity" },
  valorant: { icon: "target", label: "Valorant", category: "gaming" },
  lol: { icon: "swords", label: "League", category: "gaming" },
  "google-calendar": { icon: "calendar", label: "Calendar", category: "productivity" },
  "google-drive": { icon: "hard-drive", label: "Drive", category: "productivity" },
  notion: { icon: "notepad-text", label: "Notion", category: "productivity" },
  tracker: { icon: "activity", label: "Tracker", category: "info" },
  apex: { icon: "target", label: "Apex", category: "gaming" },
};

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  media: { icon: "disc", label: "Média" },
  social: { icon: "users", label: "Social" },
  productivity: { icon: "zap", label: "Productivité" },
  gaming: { icon: "gamepad-2", label: "Gaming" },
  development: { icon: "code", label: "Développement" },
  info: { icon: "info", label: "Infos" },
  other: { icon: "circle", label: "Autres" },
};

const CATEGORY_ORDER = ["media", "social", "productivity", "gaming", "development", "info", "other"];

function statusTone(status: LiveRecord["status"]) {
  switch (status) {
    case "connected":
      return { dot: "bg-[var(--success)]", ring: "ring-[var(--success)]/40" };
    case "loading":
      return { dot: "bg-[var(--info)] animate-pulse", ring: "ring-[var(--info)]/40" };
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
    () => records.filter((r) => r.status !== "empty" && r.status !== "error"),
    [records]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, LiveRecord[]>();
    filtered.forEach((r) => {
      const c = SERVICE_META[r.source]?.category || "other";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(r);
    });
    return map;
  }, [filtered]);

  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => grouped.has(c)),
    [grouped]
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
      <div className="space-y-4 py-1">
        {loading && filtered.length === 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 w-full rounded-[var(--panel-radius)] v8-inset animate-pulse"
              />
            ))}
          </div>
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
          categories.map((cat) => {
            const catMeta = CATEGORY_META[cat] || CATEGORY_META.other;
            return (
              <div key={cat}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <Icon name={catMeta.icon} pack="phosphor" className="h-3.5 w-3.5" />
                  {i18n(`category.${cat}`, catMeta.label)}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {grouped.get(cat)?.map((record) => {
                    const meta = SERVICE_META[record.source] || { icon: "circle", category: "other" };
                    const tone = statusTone(record.status);
                    return (
                      <Card3D
                        key={record.id}
                        onClick={handleOpen}
                        className="h-24 w-full cursor-pointer p-3"
                        radius="var(--panel-radius)"
                      >
                        <div className="flex h-full flex-col justify-between gap-1.5">
                          <div className="flex items-start justify-between">
                            {record.image ? (
                              <SafeImage
                                candidates={[record.image]}
                                alt={record.label}
                                size={28}
                                className="h-8 w-8 rounded-lg object-cover"
                                iconClassName="h-5 w-5 text-[var(--accent-primary)]"
                              />
                            ) : (
                              <Icon
                                name={meta.icon}
                                pack="phosphor"
                                className="h-6 w-6 text-[var(--accent-primary)]"
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
                            <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                              {record.label}
                            </p>
                            <p className="truncate text-[10px] text-[var(--text-muted)]" title={record.title}>
                              {record.title}
                            </p>
                          </div>
                        </div>
                      </Card3D>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </BentoCard>
  );
});

export default ConnectionCardsWidget;
