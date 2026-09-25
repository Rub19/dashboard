"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Plus, Trash2, Volume2 } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { confirmDialog } from "@/lib/confirmDialog";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { EthoneIcon } from "@/components/EthoneIcon";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface StatChannelRow {
  channelId: string;
  type: string;
  template: string;
  roleId: string | null;
  lastValue: number | null;
  lastName: string | null;
}
interface Overview {
  enabled: boolean;
  updateIntervalMinutes: number;
  channels: StatChannelRow[];
}
interface Target {
  id: string;
  name: string;
  type?: string;
}
interface TokenDoc {
  token: string;
  label: string;
  example: string;
  group: string;
  needsStats?: boolean;
}
interface Preset {
  id: string;
  label: string;
  categoryName: string;
  templates: string[];
}

const LEGACY_LABEL: Record<string, string> = {
  members: "Membres",
  humans: "Humains",
  bots: "Bots",
  online: "En ligne",
  boosts: "Boosts",
  boostTier: "Niveau de boost",
  roles: "Rôles",
  channels: "Salons",
  roleMembers: "Membres d'un rôle",
};

/** Exemple affiché avant le rendu réel (aperçu de la liste de salons Discord). */
const PRESET_SAMPLE: Record<string, string[]> = {
  draftbot: ["Tous les membres : 56", "Membres : 47", "Bots : 9"],
  statbot: ["🕐 9:00am UTC", "Membres : 13855", "1145 avant 15000", "Messages 7 j : 806", "Top membre : Lando"],
};

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Aperçu d'une catégorie de compteurs comme dans la barre latérale de Discord. */
function DiscordPreview({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl bg-[#2b2d31] p-3 text-[#b5bac1]">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#949ba4]">⌄ {title}</p>
      <ul className="space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] hover:bg-white/5">
            <Volume2 className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compteurs de salons : catégorie « SERVER STATS » en un clic, modèles personnalisés (jetons : horloge, objectif, activité,
 * classements) avec aperçu en direct. Le bot renomme les salons au plus toutes les 10 minutes (limite de Discord).
 */
export default function ServerStatsCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [tokens, setTokens] = useState<TokenDoc[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);

  // formulaire d'ajout / modification
  const [channelId, setChannelId] = useState<string | null>(null);
  const [template, setTemplate] = useState("👥 {members} membres");
  const [preview, setPreview] = useState<{ text: string; warnings: string[] } | null>(null);
  const debounced = useDebounced(template);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/server-stats`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const [ov, tk, tg] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/tokens`, { credentials: "include" }),
        fetch(`${base}/targets`, { credentials: "include" }),
      ]);
      if (!ov.ok) throw new Error(String(ov.status));
      setOverview((await ov.json()) as Overview);
      if (tk.ok) {
        const d = await tk.json();
        setTokens(d.tokens ?? []);
        setPresets(d.presets ?? []);
      }
      if (tg.ok) setTargets(((await tg.json()).channels ?? []) as Target[]);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [guildId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!guildId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeGuildLive(guildId, (e) => {
      if (e.type !== "CONFIG_UPDATED") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 300);
    });
    return () => {
      if (t) clearTimeout(t);
      unsub();
    };
  }, [guildId, load]);

  // Aperçu en direct du modèle avec les vraies valeurs du serveur
  useEffect(() => {
    if (state !== "ok" || !debounced.trim()) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    fetch(`${base}/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: debounced }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setPreview(d);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, base, state]);

  const nameOf = useMemo(() => new Map(targets.map((t) => [t.id, t.name])), [targets]);
  const groups = useMemo(() => {
    const m = new Map<string, TokenDoc[]>();
    for (const t of tokens) m.set(t.group, [...(m.get(t.group) ?? []), t]);
    return [...m.entries()];
  }, [tokens]);

  const call = async (fn: () => Promise<Response>, okTitle: string, okText: string) => {
    setBusy(true);
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || String(res.status));
      success(okTitle, okText);
      await load();
      return true;
    } catch (err) {
      showError("Action impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const setup = (id: string) =>
    call(() => fetch(`${base}/setup`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset: id }) }), "Catégorie créée", "Les salons compteurs sont créés (verrouillés) et se mettent à jour tout seuls.");

  const saveCounter = async () => {
    if (!channelId) {
      showError("Salon requis", "Choisissez le salon vocal à transformer en compteur.");
      return;
    }
    const ok = await call(
      () => fetch(`${base}/channels/${channelId}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "custom", template }) }),
      "Compteur enregistré",
      "Le salon est renommé tout de suite, puis à chaque rafraîchissement."
    );
    if (ok) setChannelId(null);
  };

  const removeCounter = async (id: string) => {
    if (!(await confirmDialog("Retirer ce compteur ? Le salon reste sur le serveur avec son dernier nom, il n'est simplement plus mis à jour.", { title: "Retirer le compteur", confirmLabel: "Retirer", tone: "danger" }))) return;
    await call(() => fetch(`${base}/channels/${id}`, { method: "DELETE", credentials: "include" }), "Compteur retiré", "Le salon n'est plus mis à jour.");
  };

  const setConfig = (patch: Partial<Pick<Overview, "enabled" | "updateIntervalMinutes">>) =>
    call(() => fetch(`${base}/config`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }), "Réglage enregistré", "Le bot applique ce réglage tout de suite.");

  const insert = (token: string) => setTemplate((t) => (t.trim() ? `${t} ${token}` : token));

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-44 text-white sm:p-8">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au hub Discord
          </Link>
          <button type="button" onClick={() => void load()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05]">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        <header className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--panel-border)] bg-white/[0.03]">
            <EthoneIcon name="mod-serverstats" className="h-6 w-6 text-emerald-300" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Compteurs de salons</h1>
            <p className="mt-0.5 text-xs text-zinc-400">Affichez les statistiques du serveur dans le nom de salons vocaux : membres, horloge, objectif, activité, membre le plus actif…</p>
          </div>
        </header>

        {state === "loading" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-500">Chargement…</div>}
        {state === "offline" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-400">Le bot n&apos;a pas répondu pour ce serveur. Vérifiez qu&apos;il est présent, puis actualisez.</div>}

        {state === "ok" && overview && (
          <>
            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">Démarrage en un clic</h2>
              <p className="mt-1 text-xs text-zinc-400">Crée la catégorie « SERVER STATS » avec des salons vocaux verrouillés (visibles, personne ne peut s&apos;y connecter) déjà configurés.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {presets.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-[11px] text-zinc-500">{p.templates.length} salons</p>
                    </div>
                    <DiscordPreview title={p.categoryName} lines={PRESET_SAMPLE[p.id] ?? p.templates} />
                    <button type="button" disabled={busy} onClick={() => void setup(p.id)} className="cursor-pointer rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
                      Créer cette catégorie
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Vos compteurs ({overview.channels.length}/25)</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-2 text-zinc-400">
                    Rafraîchir toutes les
                    <select value={overview.updateIntervalMinutes} disabled={busy} onChange={(e) => void setConfig({ updateIntervalMinutes: Number(e.target.value) })} className="rounded-lg border border-[var(--panel-border)] bg-[var(--bg-surface)] px-2 py-1 text-white">
                      {[10, 15, 30, 60, 180, 360].map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" role="switch" aria-checked={overview.enabled} disabled={busy} onClick={() => void setConfig({ enabled: !overview.enabled })} className={cn("cursor-pointer rounded-full px-3 py-1 font-semibold transition", overview.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400")}>
                    {overview.enabled ? "Actif" : "En pause"}
                  </button>
                </div>
              </div>
              {overview.channels.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-6 text-center text-xs text-zinc-500">Aucun compteur. Utilisez un démarrage en un clic ci-dessus ou ajoutez-en un ci-dessous.</p>
              ) : (
                <ul className="space-y-2">
                  {overview.channels.map((c) => (
                    <li key={c.channelId} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-xs">
                      <Volume2 className="h-4 w-4 shrink-0 text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{c.lastName ?? nameOf.get(c.channelId) ?? "(pas encore renommé)"}</p>
                        <p className="truncate font-mono text-[11px] text-zinc-500">
                          {c.type === "custom" ? c.template : `${LEGACY_LABEL[c.type] ?? c.type} · ${c.template}`}
                        </p>
                      </div>
                      {c.type === "custom" && (
                        <button
                          type="button"
                          onClick={() => {
                            setChannelId(c.channelId);
                            setTemplate(c.template);
                          }}
                          className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-2.5 py-1 font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
                        >
                          Modifier
                        </button>
                      )}
                      <button type="button" aria-label="Retirer ce compteur" disabled={busy} onClick={() => void removeCounter(c.channelId)} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">{channelId && overview.channels.some((c) => c.channelId === channelId) ? "Modifier le compteur" : "Ajouter un compteur"}</h2>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-zinc-400">Salon vocal à transformer</p>
                <ChannelPicker value={channelId} guildId={guildId} filterTypes={[2, 13]} onChange={(id) => setChannelId(id)} placeholder="Choisir un salon vocal" />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-zinc-400">Modèle du nom</p>
                <input value={template} maxLength={100} onChange={(e) => setTemplate(e.target.value)} placeholder="🕐 {time12:UTC} UTC" className="h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-indigo-400/60" />
                <div className="mt-2 rounded-xl bg-[#2b2d31] px-3 py-2 text-[13px] text-[#dbdee1]">
                  <span className="mr-2 text-[11px] uppercase tracking-wide text-[#949ba4]">Aperçu</span>
                  {preview?.text || "…"}
                </div>
                {preview && preview.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-300">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-zinc-400">Jetons (cliquez pour insérer)</p>
                {groups.map(([group, list]) => (
                  <div key={group}>
                    <p className="mb-1 text-[11px] font-semibold text-zinc-500">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((t) => (
                        <button key={t.token} type="button" title={`${t.label} — ex. ${t.example}${t.needsStats ? " (module Statistiques requis)" : ""}`} onClick={() => insert(t.token)} className="cursor-pointer rounded-lg border border-[var(--panel-border)] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-indigo-400/50 hover:text-white">
                          {t.token}
                          {t.needsStats && <span className="ml-1 text-sky-300">•</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-zinc-500">
                  <span className="text-sky-300">•</span> = nécessite le module <Link href={`/discord/stats?guildId=${guildId}`} className="underline">Statistiques</Link>. Discord limite le renommage d&apos;un salon à 2 fois toutes les 10 minutes : l&apos;horloge s&apos;affiche à la dizaine de minutes près.
                </p>
              </div>
              <button type="button" disabled={busy || !channelId} onClick={() => void saveCounter()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-4 w-4" />
                Enregistrer le compteur
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
