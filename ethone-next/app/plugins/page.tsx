"use client";

import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useWindowManager } from "@/components/WindowManagerProvider";
import {
  Music, MessageSquare, Code, CircleCheck, Play, MessageCircle, CloudSun,
  Maximize2, Plug
} from "lucide-react";

const PLUGINS = [
  { id: "spotify", label: "Spotify", icon: Music, route: "/notes/" },
  { id: "discord", label: "Discord", icon: MessageSquare, route: "/notes/" },
  { id: "github", label: "GitHub", icon: Code, route: "/notes/" },
  { id: "todoist", label: "Todoist", icon: CircleCheck, route: "/notes/" },
  { id: "youtube", label: "YouTube", icon: Play, route: "/notes/" },
  { id: "reddit", label: "Reddit", icon: MessageCircle, route: "/notes/" },
  { id: "weather", label: "Weather", icon: CloudSun, route: "/notes/" },
];

export default function PluginsPage() {
  const { records } = useLiveData();
  const { openWindow } = useWindowManager();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plugins tiers</h1>
      <p className="text-sm text-[var(--muted)]">Gérez les intégrations et ouvrez leurs live widgets.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLUGINS.map((p) => {
          const Icon = p.icon;
          const live = records.find((r) => r.source === p.id);
          const connected = live?.status === "connected";

          return (
            <Card3D key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className={`text-xs ${connected ? "text-emerald-400" : "text-[var(--muted)]"}`}>
                      {connected ? live?.title || "Connecté" : "Non connecté"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => router.push("/connections/")}
                    className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                    title="Configurer"
                  >
                    <Plug className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openWindow(p.route, p.label)}
                    className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
                    title="Ouvrir"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
