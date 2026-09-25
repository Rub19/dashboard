"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { cn } from "@/lib/utils";

export interface VoiceHubItem {
  id: string;
  name: string;
  categoryId?: string | null;
  channelId: string;
  type: "voice" | "stage";
  namingTemplate: string;
  userLimit: number;
  bitrate: number;
  accessMode: "public" | "locked" | "role_only" | "invite_only";
  autoNumbering: boolean;
  enabled: boolean;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const TOKENS = ["{username}", "{displayName}", "{number}", "{server}"];
const ACCESS_LABELS: Record<VoiceHubItem["accessMode"], string> = {
  public: "Ouvert à tous",
  locked: "Fermé (sur invitation de son propriétaire)",
  role_only: "Réservé à certains rôles",
  invite_only: "Sur invitation uniquement",
};

/** Aperçu du panneau de contrôle que le propriétaire d'un salon reçoit (mêmes actions que sur Discord). */
function RoomPanelPreview() {
  const btn = (label: string, tone = "bg-[#4e5058]") => <span className={cn("rounded-md px-3 py-1.5 text-[12px] font-semibold text-white", tone)}>{label}</span>;
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border-l-4 border-emerald-500 bg-[#2b2d31] p-4 text-left text-[13px] text-[#dbdee1]">
      <p className="text-[15px] font-bold text-white">🔊 Salon de Lucas</p>
      <p className="mt-1 text-[12px] text-[#949ba4]">Tu es le propriétaire : gère ton salon avec les boutons ci-dessous.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {btn("🔓 Ouvert", "bg-[#248046]")}
        {btn("🔒 Fermé")}
        {btn("🙈 Privé")}
        {btn("✅ Liste blanche")}
        {btn("⛔ Liste noire")}
        {btn("⚙️ Réglages", "bg-[#5865f2]")}
      </div>
    </div>
  );
}

interface Props {
  guildId: string;
  hubs: VoiceHubItem[];
  onChanged: () => Promise<void> | void;
}

/**
 * Onglet « Hubs » des salons vocaux : tant qu'aucun hub n'existe, écran d'accueil avec aperçu et installation en un clic
 * (catégorie + salon déclencheur créés sur Discord) ; ensuite, création manuelle, réglages et suppression de chaque hub.
 */
export default function VoiceHubsPanel({ guildId, hubs, onChanged }: Props) {
  const { success, error: showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<VoiceHubItem>>({});
  const [adding, setAdding] = useState(false);
  const [newTrigger, setNewTrigger] = useState<string | null>(null);
  const [newName, setNewName] = useState("Salons temporaires");
  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/voice/hubs`;

  const call = async (path: string, method: string, body: unknown, okTitle: string, okText = "") => {
    setBusy(true);
    try {
      const res = await fetch(`${base}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || String(res.status));
      await onChanged();
      success(okTitle, okText);
      return true;
    } catch (err) {
      showError("Action impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (hub: VoiceHubItem) => {
    setEditing(hub.id);
    setDraft({ name: hub.name, namingTemplate: hub.namingTemplate, userLimit: hub.userLimit, bitrate: hub.bitrate, accessMode: hub.accessMode, autoNumbering: hub.autoNumbering, enabled: hub.enabled });
  };

  const saveEdit = async (hub: VoiceHubItem) => {
    if (await call(`/${encodeURIComponent(hub.id)}`, "PUT", draft, "Hub enregistré", "Les prochains salons utiliseront ces réglages.")) setEditing(null);
  };

  const remove = async (hub: VoiceHubItem) => {
    if (!(await confirmDialog(`Supprimer le hub « ${hub.name} » ? Le salon déclencheur reste sur Discord, mais ne créera plus de salons.`, { title: "Supprimer le hub", confirmLabel: "Supprimer", tone: "danger" }))) return;
    await call(`/${encodeURIComponent(hub.id)}`, "DELETE", undefined, "Hub supprimé");
  };

  const addManual = async () => {
    if (!newTrigger) return;
    if (await call("", "POST", { channelId: newTrigger, name: newName.trim() || "Salons temporaires" }, "Hub créé", "Rejoindre ce salon crée maintenant un salon personnel.")) {
      setAdding(false);
      setNewTrigger(null);
    }
  };

  if (hubs.length === 0) {
    return (
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-center sm:p-10">
        <h3 className="text-lg font-bold text-white sm:text-xl">Vos salons vocaux temporaires ne sont pas encore configurés</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
          Vos membres rejoignent un salon « Créer ton salon » et obtiennent aussitôt leur propre salon vocal, qu&apos;ils gèrent eux-mêmes (ouvert, fermé, privé, liste blanche, liste noire). Il disparaît quand il est vide.
        </p>
        <div className="mt-6">
          <RoomPanelPreview />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void call("/quick", "POST", {}, "Salons temporaires installés", "La catégorie et le salon « Créer ton salon » sont créés et le module est activé.")}
          className="mt-8 cursor-pointer rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50"
        >
          {busy ? "Installation…" : "Créer mes salons temporaires"}
        </button>
        <p className="mx-auto mt-3 max-w-md text-[11px] text-zinc-500">Le bot crée la catégorie « SALONS TEMPORAIRES » et le salon déclencheur. Vous pouvez aussi utiliser un salon vocal existant.</p>
        <div className="mx-auto mt-6 max-w-md text-left">
          <p className="mb-1.5 text-[11px] font-medium text-zinc-400">Ou choisir un salon vocal existant comme déclencheur</p>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <ChannelPicker value={newTrigger} guildId={guildId} filterTypes={[2]} disabled={busy} onChange={(id) => setNewTrigger(id)} />
            </div>
            <button type="button" disabled={busy || !newTrigger} onClick={() => void addManual()} className="cursor-pointer rounded-xl border border-zinc-700 px-4 text-xs font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
              Utiliser
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Hubs Join-to-Create</h3>
          <p className="text-xs text-zinc-400">Salons déclencheurs créant un salon vocal personnel à la connexion</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/5">
          {adding ? "Annuler" : "Ajouter un hub"}
        </button>
      </div>

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs text-zinc-400">
            Nom du hub
            <input value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
          </label>
          <div>
            <p className="mb-1 text-xs text-zinc-400">Salon vocal déclencheur</p>
            <ChannelPicker value={newTrigger} guildId={guildId} filterTypes={[2]} disabled={busy} onChange={(id) => setNewTrigger(id)} />
          </div>
          <button type="button" disabled={busy || !newTrigger} onClick={() => void addManual()} className="h-10 cursor-pointer rounded-xl bg-emerald-500 px-5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
            Créer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hubs.map((hub) => {
          const isEditing = editing === hub.id;
          return (
            <div key={hub.id} className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-xl">
              {isEditing ? (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-400">
                    Nom du hub
                    <input value={draft.name ?? ""} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
                  </label>
                  <label className="block text-xs text-zinc-400">
                    Nom des salons créés
                    <input value={draft.namingTemplate ?? ""} maxLength={90} onChange={(e) => setDraft({ ...draft, namingTemplate: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-white outline-none focus:border-emerald-500" />
                    <span className="mt-1 flex flex-wrap gap-1">
                      {TOKENS.map((t) => (
                        <button key={t} type="button" onClick={() => setDraft({ ...draft, namingTemplate: `${draft.namingTemplate ?? ""}${t}`.slice(0, 90) })} className="cursor-pointer rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-zinc-700">
                          {t}
                        </button>
                      ))}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-zinc-400">
                      Limite de membres (0 = illimitée)
                      <input type="number" min={0} max={99} value={draft.userLimit ?? 0} onChange={(e) => setDraft({ ...draft, userLimit: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block text-xs text-zinc-400">
                      Débit audio
                      <select value={draft.bitrate ?? 64000} onChange={(e) => setDraft({ ...draft, bitrate: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500">
                        {Array.from(new Set([32000, 64000, 96000, draft.bitrate ?? 64000])).sort((a, b) => a - b).map((b) => (
                          <option key={b} value={b}>
                            {b / 1000} kbps
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs text-zinc-400">
                    Accès par défaut
                    <select value={draft.accessMode ?? "public"} onChange={(e) => setDraft({ ...draft, accessMode: e.target.value as VoiceHubItem["accessMode"] })} className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500">
                      {(Object.keys(ACCESS_LABELS) as VoiceHubItem["accessMode"][]).map((k) => (
                        <option key={k} value={k}>
                          {ACCESS_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={draft.autoNumbering ?? true} onChange={(e) => setDraft({ ...draft, autoNumbering: e.target.checked })} />
                    Numéroter automatiquement les salons
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={draft.enabled ?? true} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
                    Hub actif
                  </label>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">
                      Annuler
                    </button>
                    <button type="button" disabled={busy || !(draft.name ?? "").trim() || !(draft.namingTemplate ?? "").trim()} onClick={() => void saveEdit(hub)} className="cursor-pointer rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">{hub.name}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", hub.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400")}>{hub.enabled ? "Actif" : "Désactivé"}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-400">
                      <p>
                        Modèle : <code className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-300">{hub.namingTemplate}</code>
                      </p>
                      <p>Accès : {ACCESS_LABELS[hub.accessMode]}</p>
                      <p>Limite par défaut : {hub.userLimit > 0 ? `${hub.userLimit} membres` : "Illimitée"}</p>
                      <p>Débit audio : {Math.round(hub.bitrate / 1000)} kbps</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => startEdit(hub)} className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5">
                      Modifier
                    </button>
                    <button type="button" disabled={busy} onClick={() => void remove(hub)} className="cursor-pointer rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
