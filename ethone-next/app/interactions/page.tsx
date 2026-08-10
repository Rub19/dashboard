"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
type InteractionKind = "like" | "comment" | "share";

export default function InteractionsPage() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { items: reactions, loading, error, create, remove } = useUserData("interaction");
  const [newTarget, setNewTarget] = useState("");
  const [newKind, setNewKind] = useState<InteractionKind>("like");
  const [live, setLive] = useState(false);

  const counts = useMemo(() => {
    return {
      like: reactions.filter((r) => (r.data as { kind?: InteractionKind }).kind === "like").length,
      comment: reactions.filter((r) => (r.data as { kind?: InteractionKind }).kind === "comment").length,
      share: reactions.filter((r) => (r.data as { kind?: InteractionKind }).kind === "share").length,
    };
  }, [reactions]);

  const heatmap = useMemo(() => {
    const arr = [0, 0, 0, 0, 0, 0, 0];
    reactions.forEach((r) => {
      const at = new Date(r.created_at);
      const day = at.getDay(); // 0 = dim
      const index = day === 0 ? 6 : day - 1;
      arr[index] += 1;
    });
    return arr;
  }, [reactions]);

  function addReaction() {
    if (!newTarget.trim()) return;
    create(newTarget, "", { kind: newKind, target: newTarget });
    setNewTarget("");
  }

  function iconFor(kind: string) {
    if (kind === "like") return <Icon name="heart" className="h-5 w-5 text-rose-400" />;
    if (kind === "comment") return <Icon name="message-circle" className="h-5 w-5 text-sky-400" />;
    if (kind === "share") return <Icon name="share-2" className="h-5 w-5 text-emerald-400" />;
    return <Icon name="flame" className="h-5 w-5 text-amber-400" />;
  }

  const maxHeat = Math.max(...heatmap, 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("interactionsTitle")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="heart" className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-2xl font-bold">{counts.like}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("like")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="message-circle" className="h-6 w-6 text-sky-400" />
            <div>
              <p className="text-2xl font-bold">{counts.comment}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("comment")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="share-2" className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{counts.share}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("share")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="radio" className={`h-6 w-6 ${live ? "animate-pulse text-emerald-400" : "text-[var(--muted)]"}`} />
            <div>
              <p className="text-2xl font-bold">{live ? 1 : 0}</p>
              <p className="text-xs text-[var(--muted)]">{live ? i18n("connected") : i18n("notConnected")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">{i18n("interactionsTitle")}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{i18n("interactionsDescription")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as InteractionKind)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="like">{i18n("likeThis")}</option>
              <option value="comment">{i18n("commentThis")}</option>
              <option value="share">{i18n("shareThis")}</option>
            </select>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReaction()}
              placeholder={i18n("target")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addReaction}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLive(!live)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)]"
            >
              {live ? i18n("stop") : i18n("live")}
            </button>
          </div>
        </div>
      </Card3D>

      <Card3D>
        <h2 className="mb-4 text-sm font-semibold">{i18n("heatmap")}</h2>
        <div className="flex items-end justify-between gap-2">
          {heatmap.map((value, i) => (
            <div key={DAYS[i]} className="flex flex-col items-center gap-1">
              <div
                className="w-8 rounded-t-lg bg-violet-500/40 transition-all"
                style={{ height: `${(value / maxHeat) * 96}px` }}
              />
              <span className="text-[10px] text-[var(--muted)]">{i18n(DAYS[i])}</span>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="space-y-3">
        {reactions.map((r) => {
          const data = r.data as { kind: InteractionKind; target?: string };
          return (
            <Card3D key={r.id}>
              <div className="flex items-center gap-3">
                {iconFor(data.kind)}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i18n(data.kind)}</p>
                  <p className="text-xs text-[var(--muted)]">{data.target || r.label}</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{new Date(r.created_at).toLocaleDateString(settings.language)}</span>
                <button type="button" onClick={() => remove(r.id)} className="text-[var(--muted)] hover:text-red-400">
                  <Icon name="flame" className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
