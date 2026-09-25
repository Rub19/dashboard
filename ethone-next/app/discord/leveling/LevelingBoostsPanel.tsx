"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import ChannelPicker, { fetchGuildChannels } from "@/components/discord/ChannelPicker";
import RolePicker, { fetchGuildRoles } from "@/components/discord/RolePicker";
import { Field, Switch, inputCls } from "@/components/discord/SettingsUI";
import { confirmDialog } from "@/lib/confirmDialog";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type Target = "server" | "role" | "channel" | "category" | "member" | "event";
type Scope = "all" | "messages" | "voice";

export interface Boost {
  id: string;
  name: string;
  multiplier: number;
  targetType: Target;
  targetId: string | null;
  scope?: Scope;
  startTime: string | null;
  endTime: string | null;
  enabled: boolean;
}

const TARGETS: Array<[Target, string]> = [
  ["server", "Tout le serveur"],
  ["role", "Un rôle"],
  ["channel", "Un salon"],
  ["category", "Une catégorie de salons"],
  ["member", "Un membre"],
  ["event", "Une période (événement)"],
];
const SCOPES: Array<[Scope, string]> = [
  ["all", "Messages et vocal"],
  ["messages", "Messages seulement"],
  ["voice", "Vocal seulement"],
];
const PRESETS: Array<[number, string]> = [
  [2, "×2 double XP"],
  [1.5, "×1,5"],
  [0.5, "×0,5 malus"],
  [0.25, "×0,25"],
  [0, "×0 aucun gain"],
];

const fmtMult = (m: number) => `×${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(m)}`;
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function status(b: Boost): { label: string; cls: string } {
  const now = Date.now();
  if (!b.enabled) return { label: "Désactivé", cls: "bg-zinc-800 text-zinc-400" };
  if (b.startTime && new Date(b.startTime).getTime() > now) return { label: "Programmé", cls: "bg-sky-500/15 text-sky-300" };
  if (b.endTime && new Date(b.endTime).getTime() < now) return { label: "Terminé", cls: "bg-zinc-800 text-zinc-400" };
  return { label: "Actif", cls: "bg-emerald-500/15 text-emerald-300" };
}

interface Preview {
  member: { id: string; name: string };
  multiplier: number;
  applied: Array<{ id: string; name: string; multiplier: number }>;
  baseXp: number;
  xp: number;
  scope: string;
}

/**
 * Multiplicateurs d'XP : bonus ET malus, sur le serveur entier, un rôle, un salon, une catégorie, un membre ou une période,
 * pour les messages, le vocal ou les deux. Ils se cumulent ; un simulateur montre ce qu'un membre gagnerait réellement.
 */
export default function LevelingBoostsPanel({ guildId, boosts, disabled, onChanged }: { guildId: string; boosts: Boost[]; disabled: boolean; onChanged: () => Promise<void> | void }) {
  const { success, error: showError } = useToast();
  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/leveling/boosts`;
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<Target>("server");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(2);
  const [scope, setScope] = useState<Scope>("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [pvUser, setPvUser] = useState("");
  const [pvChannel, setPvChannel] = useState<string | null>(null);
  const [pvScope, setPvScope] = useState<"messages" | "voice">("messages");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([fetchGuildRoles(guildId), fetchGuildChannels(guildId)]).then(([roles, channels]) => {
      if (alive) setNames(Object.fromEntries([...roles.map((r) => [r.id, `@${r.name}`]), ...channels.map((c) => [c.id, `#${c.name}`])]));
    });
    return () => {
      alive = false;
    };
  }, [guildId]);

  const call = async (url: string, method: string, body: unknown, okTitle: string, okText = "") => {
    setBusy(true);
    try {
      const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      await onChanged();
      success(okTitle, okText);
      return json;
    } catch (err) {
      showError("Action impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const needsTarget = ["role", "channel", "category", "member"].includes(targetType);
  const memberOk = targetType !== "member" || /^\d{5,25}$/.test(targetId ?? "");
  const invalid = !name.trim() || (needsTarget && !targetId) || !memberOk || (start && end && new Date(end) <= new Date(start)) || multiplier < 0 || multiplier > 10;

  const add = async () => {
    const ok = await call(base, "POST", { name: name.trim(), multiplier, targetType, targetId: needsTarget ? targetId : null, scope, startTime: toIso(start), endTime: toIso(end), enabled: true }, "Multiplicateur créé", multiplier < 1 ? "Malus appliqué à partir de maintenant." : "Bonus appliqué à partir de maintenant.");
    if (ok) {
      setName("");
      setTargetId(null);
    }
  };

  const remove = async (b: Boost) => {
    if (!(await confirmDialog(`Supprimer le multiplicateur « ${b.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer", tone: "danger" }))) return;
    await call(`${base}/${encodeURIComponent(b.id)}`, "DELETE", undefined, "Multiplicateur supprimé");
  };

  const runPreview = async () => {
    setPreview(null);
    try {
      const qs = new URLSearchParams({ userId: pvUser.trim(), scope: pvScope, ...(pvChannel ? { channelId: pvChannel } : {}) });
      const res = await fetch(`${base}/preview?${qs}`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || String(res.status));
      setPreview(json as Preview);
    } catch (err) {
      showError("Simulation impossible", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
    }
  };

  const targetLabel = (b: Boost) => (b.targetType === "server" ? "Tout le serveur" : b.targetType === "event" ? "Période" : b.targetType === "member" ? `Membre ${b.targetId}` : names[b.targetId ?? ""] ?? b.targetId ?? "—");
  const sorted = [...boosts].sort((a, b) => b.multiplier - a.multiplier);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div>
          <h3 className="text-base font-bold text-white">Multiplicateurs d&apos;XP</h3>
          <p className="mt-0.5 text-xs text-neutral-400">Bonus (×2), malus (×0,5) ou blocage (×0), sur un rôle, un salon, une catégorie, un membre ou tout le serveur. Ils se cumulent, dans la limite de ×10.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Nom">
            <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex. Week-end double XP, Membres boosters…" className={inputCls} />
          </Field>
          <Field label="Cible">
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value as Target); setTargetId(null); }} className={inputCls}>
              {TARGETS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {targetType === "role" && (
            <Field label="Rôle">
              <RolePicker value={targetId} guildId={guildId} onChange={(id) => setTargetId(id || null)} />
            </Field>
          )}
          {targetType === "channel" && (
            <Field label="Salon" hint="Un fil de discussion compte comme son salon.">
              <ChannelPicker value={targetId} guildId={guildId} filterTypes={[0, 2, 5, 13, 15]} onChange={(id) => setTargetId(id || null)} />
            </Field>
          )}
          {targetType === "category" && (
            <Field label="Catégorie" hint="Tous les salons de la catégorie.">
              <ChannelPicker value={targetId} guildId={guildId} filterTypes={[4]} onChange={(id) => setTargetId(id || null)} />
            </Field>
          )}
          {targetType === "member" && (
            <Field label="Identifiant du membre" hint="Clic droit sur le membre → Copier l'identifiant.">
              <input value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value.trim() || null)} placeholder="123456789012345678" className={cn(inputCls, "font-mono", targetId && !memberOk && "border-rose-500/60")} />
            </Field>
          )}
          <Field label="Multiplicateur" hint={multiplier < 1 ? (multiplier === 0 ? "Aucun gain d'XP pour la cible." : "Malus : la cible gagne moins d'XP.") : multiplier === 1 ? "Neutre : sans effet." : "Bonus : la cible gagne plus d'XP."}>
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min={0} max={10} step={0.05} value={multiplier} onChange={(e) => setMultiplier(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} className={cn(inputCls, "w-28 text-center font-mono")} />
              {PRESETS.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setMultiplier(v)} className={cn("cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition", multiplier === v ? "bg-[#5865F2] text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700")}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="S'applique à">
            <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className={inputCls}>
              {SCOPES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Début (optionnel)">
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fin (optionnel)" hint={start && end && new Date(end) <= new Date(start) ? "La fin doit être après le début." : "Sans dates, le multiplicateur reste actif jusqu'à sa suppression."}>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <button type="button" disabled={busy || disabled || Boolean(invalid)} onClick={() => void add()} className="cursor-pointer rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50">
          Ajouter le multiplicateur
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="text-base font-bold text-white">Multiplicateurs en place ({boosts.length})</h3>
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-500">Aucun multiplicateur : tout le monde gagne l&apos;XP de base.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((b) => {
              const st = status(b);
              const kind = b.multiplier > 1 ? "bonus" : b.multiplier < 1 ? "malus" : "neutre";
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-bold", kind === "bonus" ? "bg-emerald-500/15 text-emerald-300" : kind === "malus" ? "bg-rose-500/15 text-rose-300" : "bg-zinc-800 text-zinc-300")}>{fmtMult(b.multiplier)}</span>
                      <span className="font-semibold text-white">{b.name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", st.cls)}>{st.label}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {targetLabel(b)} · {SCOPES.find(([k]) => k === (b.scope ?? "all"))?.[1]}
                      {b.startTime && ` · dès le ${new Date(b.startTime).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                      {b.endTime && ` · jusqu'au ${new Date(b.endTime).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={b.enabled} disabled={busy || disabled} label={`Activer ${b.name}`} onChange={(v) => void call(`${base}/${encodeURIComponent(b.id)}`, "PATCH", { enabled: v }, v ? "Multiplicateur activé" : "Multiplicateur désactivé")} />
                    <button type="button" disabled={busy || disabled} onClick={() => void remove(b)} className="cursor-pointer rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                      Supprimer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div>
          <h3 className="text-base font-bold text-white">Simulateur</h3>
          <p className="mt-0.5 text-xs text-neutral-400">Combien d&apos;XP gagnerait un membre, dans un salon, avec les multiplicateurs actuels ? Rien n&apos;est modifié.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Identifiant du membre">
            <input value={pvUser} onChange={(e) => setPvUser(e.target.value)} placeholder="123456789012345678" className={cn(inputCls, "font-mono")} />
          </Field>
          <Field label="Salon (optionnel)">
            <ChannelPicker value={pvChannel} guildId={guildId} filterTypes={[0, 2, 5, 13, 15]} allowClear onChange={(id) => setPvChannel(id || null)} />
          </Field>
          <Field label="Type de gain">
            <select value={pvScope} onChange={(e) => setPvScope(e.target.value as "messages" | "voice")} className={inputCls}>
              <option value="messages">Un message</option>
              <option value="voice">Une minute de vocal</option>
            </select>
          </Field>
        </div>
        <button type="button" disabled={!/^\d{5,25}$/.test(pvUser.trim()) || disabled} onClick={() => void runPreview()} className="cursor-pointer rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">
          Simuler
        </button>
        {preview && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm">
            <p className="text-white">
              <strong>{preview.member.name}</strong> gagnerait <strong className="text-emerald-300">{new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(preview.xp)} XP</strong>
              <span className="text-neutral-400"> (base {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(preview.baseXp)} × {fmtMult(preview.multiplier)})</span>
            </p>
            {preview.applied.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">Aucun multiplicateur ne s&apos;applique : XP de base.</p>
            ) : (
              <ul className="mt-2 space-y-0.5 text-xs text-neutral-300">
                {preview.applied.map((a) => (
                  <li key={a.id}>
                    {a.name} <span className="font-mono text-neutral-400">{fmtMult(a.multiplier)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
