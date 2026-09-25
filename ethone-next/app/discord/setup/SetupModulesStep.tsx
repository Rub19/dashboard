"use client";

import { useEffect, useMemo, useState } from "react";
import { useModuleStatus } from "@/lib/hooks/useModuleStatus";
import { DISCORD_MODULES } from "@/lib/discord-modules";
import { EthoneIcon } from "@/components/EthoneIcon";
import { useToast } from "@/components/ToastProvider";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

/** Mêmes ensembles que la configuration rapide sur Discord (discord-bot/src/services/moduleRegistry.ts). */
const CORE = ["moderation", "music", "reminders", "tags"];
const PRESETS: Array<{ id: string; emoji: string; label: string; text: string; ids: string[] | "all" }> = [
  { id: "minimal", emoji: "⚡", label: "Minimal", text: "Modération, musique, rappels et tags.", ids: CORE },
  {
    id: "community",
    emoji: "🎉",
    label: "Communauté",
    text: "Accueil, rôles, niveaux, économie, sondages, événements, tickets…",
    ids: [...CORE, "welcome", "roles", "leveling", "economy", "suggestions", "polls", "giveaways", "events", "forms", "starboard", "highlights", "birthdays", "voice", "tickets", "invites", "afk", "counting", "stats", "statroles", "serverstats", "sticky", "commands"],
  },
  { id: "security", emoji: "🛡️", label: "Sécurité", text: "Anti-Raid, Anti-Nuke, AutoMod, journaux, accueil, tickets, sauvegardes.", ids: [...CORE, "security", "anti-nuke", "automod", "logs", "welcome", "tickets", "backups"] },
  { id: "all", emoji: "✅", label: "Tout activer", text: "Tous les modules, y compris l'assistant IA.", ids: "all" },
];

const GROUPS: Array<{ title: string; ids: string[] }> = [
  { title: "Protection & gestion", ids: ["moderation", "security", "anti-nuke", "automod", "logs", "tickets", "backups", "invites"] },
  { title: "Communauté & animation", ids: ["welcome", "roles", "leveling", "economy", "suggestions", "polls", "giveaways", "events", "forms", "starboard", "highlights", "birthdays", "music", "voice", "commands", "tags", "reminders", "sticky", "afk", "counting", "stats", "statroles", "serverstats", "ai"] },
];

const EXTRA_TITLES: Record<string, string> = { ai: "Assistant IA" };

/**
 * Étape « Modules » de l'assistant : un serveur qui vient d'inviter le bot démarre avec seulement le socle actif ; on choisit
 * ici ce qu'on active, avec des préréglages ou module par module. Chaque changement est appliqué tout de suite sur le bot
 * (même registre que la commande /module et que la configuration rapide sur Discord).
 */
export default function SetupModulesStep({ guildId }: { guildId: string }) {
  const { status, setModuleEnabled } = useModuleStatus(guildId, true);
  const { error: showError, success } = useToast();
  const [view, setView] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => setView(status), [status]);

  const known = Object.keys(view).length > 0;
  const enabledIds = useMemo(() => Object.keys(view).filter((id) => view[id]).sort(), [view]);
  const allIds = useMemo(() => Object.keys(view), [view]);

  const applyPreset = async (ids: string[] | "all") => {
    if (!API_BASE || busy) return;
    const wanted = ids === "all" ? allIds : ids;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${encodeURIComponent(guildId)}/module-status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: wanted }),
      });
      if (!res.ok) throw new Error("refusé");
      const data = await res.json();
      if (data?.modules) setView(data.modules as Record<string, boolean>);
      success("Modules mis à jour", "Le bot applique ce choix tout de suite.");
    } catch {
      showError("Modules non modifiés", "Le bot n'a pas répondu ou a refusé le changement.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string) => {
    const next = !view[id];
    setView((v) => ({ ...v, [id]: next }));
    const ok = await setModuleEnabled(id, next);
    if (!ok) {
      setView((v) => ({ ...v, [id]: !next }));
      showError("Module non modifié", "Le bot n'a pas répondu ou a refusé le changement.");
    }
  };

  const sameAs = (ids: string[] | "all") => {
    const wanted = (ids === "all" ? allIds : ids).slice().sort();
    return wanted.length === enabledIds.length && wanted.every((id, i) => id === enabledIds[i]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h3 className="mb-1 text-xl font-bold text-white">3. Choisir les modules</h3>
        <p className="text-xs text-zinc-400">
          Rien ne s&apos;active sans votre accord : un nouveau serveur démarre avec le socle essentiel seulement. Choisissez un préréglage, puis ajustez module par module. Tout reste modifiable plus tard.
        </p>
      </div>

      {!API_BASE || !known ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
          Le bot n&apos;a pas répondu pour ce serveur : les modules ne peuvent pas être affichés. Vérifiez que le bot est bien présent, puis rechargez la page.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => {
              const active = sameAs(p.ids);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => applyPreset(p.ids)}
                  className={`cursor-pointer rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    active ? "border-indigo-400/60 bg-indigo-500/10 ring-1 ring-indigo-400/30" : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="text-lg">{p.emoji}</span>
                    {p.label}
                    {active && <span className="ml-auto rounded-full bg-indigo-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">Actuel</span>}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{p.text}</p>
                </button>
              );
            })}
          </div>

          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{g.title}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.ids
                  .filter((id) => id in view)
                  .map((id) => {
                    const meta = DISCORD_MODULES.find((m) => m.id === id);
                    const on = view[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(id)}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                          on ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                        }`}
                      >
                        {meta ? <EthoneIcon name={meta.icon} className={`h-5 w-5 shrink-0 ${on ? meta.tint : "text-zinc-600"}`} /> : <span className="h-5 w-5 shrink-0" />}
                        <span className={`flex-1 truncate text-sm font-medium ${on ? "text-white" : "text-zinc-400"}`}>{meta?.title ?? EXTRA_TITLES[id] ?? id}</span>
                        <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-zinc-700"}`}>
                          <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all ${on ? "left-[16px]" : "left-[2px]"}`} />
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-zinc-500">{enabledIds.length} module(s) actif(s) sur {allIds.length}.</p>
        </>
      )}
    </div>
  );
}
