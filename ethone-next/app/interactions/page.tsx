"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Flame, Heart, MessageCircle, Share2, Radio, ArrowRight, Plus } from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Interaction = { id: string; kind: "like" | "comment" | "share"; target: string; at: string };
type Weekly = number[];

export default function InteractionsPage() {
  const i18n = useI18n();
  const [reactions, setReactions] = useLocalStorage<Interaction[]>("ethone:interactions", [
    { id: "1", kind: "like", target: "Note Spotify", at: "il y a 2 h" },
  ]);
  const [heatmap, setHeatmap] = useLocalStorage<Weekly>("ethone:interactions-heatmap", [1, 2, 1, 3, 2, 0, 1]);
  const [live, setLive] = useLocalStorage<boolean>("ethone:interactions-live", false);
  const [newTarget, setNewTarget] = useState("");
  const [newKind, setNewKind] = useState<"like" | "comment" | "share">("like");

  const counts = useMemo(() => {
    return {
      like: reactions.filter((r) => r.kind === "like").length,
      comment: reactions.filter((r) => r.kind === "comment").length,
      share: reactions.filter((r) => r.kind === "share").length,
    };
  }, [reactions]);

  function addReaction() {
    if (!newTarget.trim()) return;
    const next: Interaction = { id: String(Date.now()), kind: newKind, target: newTarget, at: "à l’instant" };
    setReactions([next, ...reactions]);
    const today = new Date().getDay(); // 0 = dim
    const index = today === 0 ? 6 : today - 1;
    setHeatmap(heatmap.map((v, i) => (i === index ? Math.min(v + 1, 8) : v)));
    setNewTarget("");
  }

  function removeReaction(id: string) {
    setReactions(reactions.filter((r) => r.id !== id));
  }

  const maxHeat = Math.max(...heatmap, 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("interactions")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-2xl font-bold">{counts.like}</p>
              <p className="text-xs text-[var(--muted)]">J’aime</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-sky-400" />
            <div>
              <p className="text-2xl font-bold">{counts.comment}</p>
              <p className="text-xs text-[var(--muted)]">Commentaires</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{counts.share}</p>
              <p className="text-xs text-[var(--muted)]">Partages</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Radio className={`h-6 w-6 ${live ? "animate-pulse text-emerald-400" : "text-[var(--muted)]"}`} />
            <div>
              <p className="text-2xl font-bold">{live ? 1 : 0}</p>
              <p className="text-xs text-[var(--muted)]">{live ? "Flux actif" : "Flux inactif"}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Feed d’interactions</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">Ajoutez vos réactions. Le flux enregistre likes, commentaires et partages localement pour l’instant.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as "like" | "comment" | "share")}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="like">J’aime</option>
              <option value="comment">Commentaire</option>
              <option value="share">Partage</option>
            </select>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReaction()}
              placeholder="Cible..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addReaction}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLive(!live)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)]"
            >
              {live ? "Stop" : "Live"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card3D>

      <Card3D>
        <h2 className="mb-4 text-sm font-semibold">Heatmap</h2>
        <div className="flex items-end justify-between gap-2">
          {heatmap.map((value, i) => (
            <div key={DAYS[i]} className="flex flex-col items-center gap-1">
              <div
                className="w-8 rounded-t-lg bg-violet-500/40 transition-all"
                style={{ height: `${(value / maxHeat) * 96}px` }}
              />
              <span className="text-[10px] text-[var(--muted)]">{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="space-y-3">
        {reactions.map((r) => (
          <Card3D key={r.id}>
            <div className="flex items-center gap-3">
              {r.kind === "like" && <Heart className="h-5 w-5 text-rose-400" />}
              {r.kind === "comment" && <MessageCircle className="h-5 w-5 text-sky-400" />}
              {r.kind === "share" && <Share2 className="h-5 w-5 text-emerald-400" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium capitalize">{r.kind}</p>
                <p className="text-xs text-[var(--muted)]">{r.target}</p>
              </div>
              <span className="text-xs text-[var(--muted)]">{r.at}</span>
              <button type="button" onClick={() => removeReaction(r.id)} className="text-[var(--muted)] hover:text-red-400">
                <Flame className="h-4 w-4" />
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
