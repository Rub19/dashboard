"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/ui/Button";

function isAllowedHttpUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

export default function RssPage() {
  const i18n = useI18n();
  const { error: showError } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<{ title: string; description: string; items: { title: string; link: string; description: string; pubDate: string }[] } | null>(null);

  async function handleLoad() {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isAllowedHttpUrl(trimmed)) {
      showError(i18n("invalidUrl") || "URL invalide");
      return;
    }
    setLoading(true);
    setFeed(null);
    try {
      const res = await fetchWorker(`/api/rss?url=${encodeURIComponent(trimmed)}`);
      if (res?.data) setFeed(res.data);
      else showError(i18n("error"));
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("rssTitle")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <Card3D>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{i18n("rssUrlPlaceholder")}</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLoad(); }}
              placeholder={i18n("rssUrlPlaceholder")}
              className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleLoad}
            disabled={!url.trim()}
            isLoading={loading}
            leftIcon={<Icon name="rss" className="h-4 w-4" />}
          >
            {i18n("load")}
          </Button>
        </div>
      </Card3D>

      {feed && (
        <Card3D>
          <h2 className="text-lg font-semibold">{feed.title}</h2>
          <p className="text-sm text-[var(--muted)]">{feed.description}</p>
        </Card3D>
      )}

      <div className="space-y-3">
        {feed?.items.map((item, i) => {
          const safeLink = isAllowedHttpUrl(item.link) ? item.link : undefined;
          return (
            <Card3D key={i}>
              {safeLink ? (
                <a href={safeLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
                  <p className="font-medium">{item.title}</p>
                  {item.description && <p className="text-sm text-[var(--muted)] line-clamp-2">{stripTags(item.description)}</p>}
                  {item.pubDate && <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.pubDate).toLocaleString()}</p>}
                </a>
              ) : (
                <div className="block">
                  <p className="font-medium">{item.title}</p>
                  {item.description && <p className="text-sm text-[var(--muted)] line-clamp-2">{stripTags(item.description)}</p>}
                  {item.pubDate && <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.pubDate).toLocaleString()}</p>}
                </div>
              )}
            </Card3D>
          );
        })}
      </div>
      </div>
    </div>
  );
}
