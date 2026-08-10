"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { Flame, Heart, MessageCircle, Share2 } from "lucide-react";

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
  const [reactions] = useState([
    { id: 1, kind: "like", target: "Note Spotify", at: "il y a 2 h" },
    { id: 2, kind: "comment", target: "Match Valorant", at: "hier" },
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Interactions</h1>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

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
