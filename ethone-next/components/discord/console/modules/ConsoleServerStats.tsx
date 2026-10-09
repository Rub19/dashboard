"use client";

import { useCallback, useEffect, useState } from "react";
import ChannelPicker, { fetchGuildChannels, invalidateGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Stepper, TextField, useGuildApi } from "../kit";

type StatType = "members" | "humans" | "bots" | "online" | "boosts" | "boostTier" | "roles" | "channels" | "roleMembers" | "custom";
type Counter = { channelId: string; type: StatType; template: string; roleId: string | null; lastValue: number | null; lastName: string | null };
type Overview = { enabled: boolean; updateIntervalMinutes: number; channels: Counter[] };
type Token = { token: string; label: string; example: string; group: string };
type Preset = { id: string; label: string; templates: string[] };

const MAX_COUNTERS = 25;

/** Salons compteurs (format Keeper) : noms de salons qui affichent les chiffres du serveur. */
export default function ConsoleServerStats({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [template, setTemplate] = useState("Membres : {members}");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Overview>("/server-stats/overview");
    setOv(r ?? { enabled: false, updateIntervalMinutes: 15, channels: [] });
  }, [api]);
  useEffect(() => {
    void load();
    api<{ tokens: Token[]; presets: Preset[] }>("/server-stats/tokens", { silent: true }).then((r) => {
      if (r) {
        setTokens(r.tokens);
        setPresets(r.presets);
      }
    });
    fetchGuildChannels(guildId).then(setChannels);
  }, [api, guildId, load]);

  // Aperçu en direct du modèle, 400 ms après la dernière frappe.
  useEffect(() => {
    if (!template.trim()) return setPreview(null);
    const t = window.setTimeout(() => {
      api<{ text?: string }>("/server-stats/preview", { method: "POST", json: { template }, silent: true }).then((r) => setPreview(r?.text ?? null));
    }, 400);
    return () => window.clearTimeout(t);
  }, [api, template]);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;
  const saveInterval = async (n: number) => {
    setOv((o) => (o ? { ...o, updateIntervalMinutes: n } : o));
    await api("/server-stats/config", { method: "PUT", json: { updateIntervalMinutes: n } });
  };
  const upsert = async (channelId: string, tpl: string) => {
    setBusy(true);
    const r = await api(`/server-stats/channels/${channelId}`, { method: "PUT", json: { type: "custom", template: tpl } });
    setBusy(false);
    if (r) void load();
    return !!r;
  };
  const add = async () => {
    if (await upsert(newChannel, template.trim())) setNewChannel("");
  };
  const remove = async (c: Counter) => {
    if (!(await confirmDialog(`Retirer le compteur de « ${c.lastName ?? channelName(c.channelId)} » ? Le salon n'est pas supprimé.`, { title: "Retirer", confirmLabel: "Retirer" }))) return;
    if (await api(`/server-stats/channels/${c.channelId}`, { method: "DELETE" })) void load();
  };
  const setup = async (preset: string) => {
    setBusy(true);
    const r = await api<{ overview: Overview }>("/server-stats/setup", { method: "POST", json: { preset } });
    setBusy(false);
    if (r) {
      setOv(r.overview);
      invalidateGuildChannels(guildId);
      fetchGuildChannels(guildId).then(setChannels);
    }
  };
  const refresh = async () => {
    setBusy(true);
    await api("/server-stats/refresh", { method: "POST" });
    setBusy(false);
    void load();
  };

  const counters = ov?.channels ?? [];
  const full = counters.length >= MAX_COUNTERS;
  const groups = [...new Set(tokens.map((t) => t.group))];

  return (
    <ConsolePage title="Salons compteurs" actions={<GhostButton disabled={busy || counters.length === 0} onClick={refresh}>Actualiser maintenant</GhostButton>}>
      {ov && !ov.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : les noms des salons ne sont plus mis à jour. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      )}

      <Panel title="Mise à jour">
        <Row label="Fréquence" hint="Discord autorise 2 renommages d'un salon toutes les 10 minutes.">
          {ov ? <Stepper value={ov.updateIntervalMinutes} min={10} max={360} step={5} unit="minutes" onCommit={saveInterval} /> : <span className="text-xs text-[var(--text-muted)]">…</span>}
        </Row>
      </Panel>

      <Panel title="Compteurs" subtitle={`${counters.length}/${MAX_COUNTERS} salons`}>
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : counters.length === 0 ? (
          <div className="space-y-3 px-5 py-5">
            <p className="text-center text-xs text-[var(--text-muted)]">Aucun compteur. Crée une catégorie prête à l&apos;emploi ou ajoute un salon ci-dessous.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {presets.map((p) => (
                <GhostButton key={p.id} disabled={busy} onClick={() => setup(p.id)}>
                  {p.label}
                </GhostButton>
              ))}
            </div>
          </div>
        ) : (
          <ul>
            {counters.map((c) => (
              <li key={c.channelId} className="grid items-center gap-2 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">🔊 {c.lastName ?? channelName(c.channelId)}</p>
                  <div className="mt-1.5">
                    <TextField value={c.template} maxLength={100} mono width="w-full max-w-sm" onCommit={(v) => upsert(c.channelId, v)} />
                  </div>
                </div>
                <GhostButton onClick={() => remove(c)}>Retirer</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ajouter un compteur">
        <Row label="Salon" hint="De préférence un salon vocal verrouillé.">
          <ChannelPicker guildId={guildId} value={newChannel} filterTypes={[2, 0]} placeholder="Choisir un salon" onChange={(id) => setNewChannel(id)} />
        </Row>
        <Row label="Nom affiché" hint={preview ? `Aperçu : ${preview}` : "Clique sur une variable pour l'ajouter."}>
          <input
            value={template}
            maxLength={100}
            onChange={(e) => setTemplate(e.target.value)}
            aria-label="Nom affiché"
            className="h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
        </Row>
        {groups.map((g) => (
          <Row key={g} label={g}>
            <div className="flex flex-wrap gap-1">
              {tokens
                .filter((t) => t.group === g)
                .map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    title={`${t.label} (ex. ${t.example})`}
                    onClick={() => setTemplate((v) => `${v}${v.endsWith(" ") || !v ? "" : " "}${t.token}`.slice(0, 100))}
                    className="rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {t.token}
                  </button>
                ))}
            </div>
          </Row>
        ))}
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button
            type="button"
            disabled={busy || full || !newChannel || !template.trim() || counters.some((c) => c.channelId === newChannel)}
            onClick={add}
            className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            Ajouter le compteur
          </button>
        </div>
      </Panel>
    </ConsolePage>
  );
}
