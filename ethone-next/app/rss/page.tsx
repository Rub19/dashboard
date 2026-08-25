"use client";

import { useState } from "react";
import BentoCard from "@/components/BentoCard";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import Input from "@/components/Input";
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
    <div className="h-full min-h-0 w-full p-4">
      <BentoCard
        title={i18n("rssTitle")}
        icon="rss"
        className="h-full w-full"
        scrollable
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLoad(); }}
            placeholder={i18n("rssUrlPlaceholder")}
            aria-label={i18n("rssUrlPlaceholder")}
            className="min-w-0 flex-1"
          />
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

        {feed && (
          <>
            <div className="mb-4 border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{feed.title}</h2>
              <p className="text-sm text-[var(--muted)]">{feed.description}</p>
            </div>

            <div className="space-y-3">
              {feed.items.map((item, i) => {
                const safeLink = isAllowedHttpUrl(item.link) ? item.link : undefined;
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-[var(--accent-primary)]/20 hover:bg-white/[0.04]"
                  >
                    {safeLink ? (
                      <a href={safeLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
                        <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                        {item.description && <p className="text-sm text-[var(--muted)] line-clamp-2">{stripTags(item.description)}</p>}
                        {item.pubDate && <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.pubDate).toLocaleString()}</p>}
                      </a>
                    ) : (
                      <div className="block">
                        <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                        {item.description && <p className="text-sm text-[var(--muted)] line-clamp-2">{stripTags(item.description)}</p>}
                        {item.pubDate && <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.pubDate).toLocaleString()}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </BentoCard>
    </div>
  );
}
