import Card3D from "@/components/Card3D";
import { Activity, Mail, Brain, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-[var(--muted)]">Priorités</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-[var(--muted)]">Messages non lus</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">842</p>
              <p className="text-xs text-[var(--muted)]">Signaux</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">ON</p>
              <p className="text-xs text-[var(--muted)]">Brain</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Live Now</h2>
          <div className="space-y-3">
            <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-2 w-5/6 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </Card3D>
        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Flows</h2>
          <p className="min-w-0 truncate text-sm text-[var(--muted)]">
            Le contexte essentiel reste au premier plan pour une journée calme et efficace.
          </p>
        </Card3D>
        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Tracker</h2>
          <p className="text-sm text-[var(--muted)]">
            Derniers matchs et statistiques en direct.
          </p>
        </Card3D>
      </div>
    </div>
  );
}
