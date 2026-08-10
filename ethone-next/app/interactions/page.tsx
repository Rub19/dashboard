"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { Flame, Heart, MessageCircle, Share2, Radio, ArrowRight } from "lucide-react";

const HEAT = [
  { day: "Lun", value: 3 },
  { day: "Mar", value: 5 },
  { day: "Mer", value: 2 },
  { day: "Jeu", value: 4 },
  { day: "Ven", value: 6 },
  { day: "Sam", value: 1 },
  { day: "Dim", value: 2 },
];

export default function InteractionsPage() {
  const i18n = useI18n();
  const [reactions] = useState([
    { id: 1, kind: "like", target: "Note Spotify", at: "il y a 2 h" },
    { id: 2, kind: "comment", target: "Match Valorant", at: "hier" },
  ]);
  const [live, setLive] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("interactions")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-[var(--muted)]">J’aime</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-sky-400" />
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-[var(--muted)]">Commentaires</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">5</p>
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
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Centralisez les likes, commentaires, partages et réactions sur vos contenus. Suivez la chaleur de vos interactions et répondez depuis un seul endroit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLive(!live)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {live ? "Désactiver le flux" : "Activer le flux"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      <Card3D>
        <h2 className="mb-4 text-sm font-semibold">Heatmap</h2>
        <div className="flex items-end justify-between gap-2">
          {HEAT.map((h) => (
            <div key={h.day} className="flex flex-col items-center gap-1">
              <div
                className="w-8 rounded-t-lg bg-violet-500/40 transition-all"
                style={{ height: `${h.value * 16}px` }}
              />
              <span className="text-[10px] text-[var(--muted)]">{h.day}</span>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="space-y-3">
        {reactions.map((r) => (
          <Card3D key={r.id}>
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium capitalize">{r.kind}</p>
                <p className="text-xs text-[var(--muted)]">{r.target}</p>
              </div>
              <span className="text-xs text-[var(--muted)]">{r.at}</span>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
