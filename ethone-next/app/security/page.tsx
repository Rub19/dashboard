"use client";

import { useWorker } from "@/lib/hooks/useWorker";
import Card3D from "@/components/Card3D";
import { Shield, Lock, Smartphone, History } from "lucide-react";

type SecurityEvent = {
  id?: string;
  type?: string;
  action?: string;
  created_at?: string;
  at?: string;
  ip?: string;
  status?: string;
};

export default function SecurityPage() {
  const { data, loading } = useWorker<{ data: SecurityEvent[] }>("/api/auth/security-events");
  const events = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sécurité</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">Authentification</p>
              <p className="font-medium">OTP + Passkeys</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Lock className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">Chiffrement</p>
              <p className="font-medium">TLS + Tokens JWT</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">Appareils</p>
              <p className="font-medium">Gérer les sessions</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-sky-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">Historique</p>
              <p className="font-medium">{loading ? "-" : events.length} événements</p>
            </div>
          </div>
        </Card3D>
      </div>

      <h2 className="text-lg font-semibold">Événements récents</h2>
      <div className="space-y-3">
        {loading ? (
          <Card3D>
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" />
          </Card3D>
        ) : events.length === 0 ? (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">Aucun événement de sécurité.</p>
          </Card3D>
        ) : (
          events.slice(0, 20).map((event, i) => (
            <Card3D key={event.id || i}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.type || event.action || "Événement"}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{new Date(event.created_at || event.at || "").toLocaleString("fr-FR")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {event.ip || event.status || "-"}
                </span>
              </div>
            </Card3D>
          ))
        )}
      </div>
    </div>
  );
}
