"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

export default function RssPage() {
  const i18n = useI18n();
  const { error: showError } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<{ title: string; description: string; items: { title: string; link: string; description: string; pubDate: string }[] } | null>(null);

  async function handleLoad() {
    if (!url.trim()) return;
    setLoading(true);
    setFeed(null);
    try {
      const res = await fetchWorker(`/api/rss?url=${encodeURIComponent(url.trim())}`);
      if (res?.data) setFeed(res.data);
      else showError(i18n("error"));
    } catch (err) {
      showError(err instanceof Error ? err.message : i18n("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("rssTitle")}</h1>

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
              className="w-full rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="rss" className="h-4 w-4" />}
            {i18n("load")}
          </button>
        </div>
      </Card3D>

      {feed && (
        <Card3D>
          <h2 className="text-lg font-semibold">{feed.title}</h2>
          <p className="text-sm text-[var(--muted)]">{feed.description}</p>
        </Card3D>
      )}

      <div className="space-y-3">
        {feed?.items.map((item, i) => (
          <Card3D key={i}>
            <a href={item.link} target="_blank" rel="noreferrer" className="block hover:opacity-90">
              <p className="font-medium">{item.title}</p>
              {item.description && <p className="text-sm text-[var(--muted)] line-clamp-2">{item.description.replace(/<[^>]+>/g, " ")}</p>}
              {item.pubDate && <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.pubDate).toLocaleString()}</p>}
            </a>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
