"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { useToast } from "@/components/ToastProvider";
import { ChannelAdder, Chip, ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Config = {
  enabled: boolean;
  channelId: string | null;
  emoji: string;
  threshold: number;
  selfStarAllowed: boolean;
  ignoreBots: boolean;
  allowNsfw: boolean;
  removeBelowThreshold: boolean;
  ignoredChannelIds: string[];
  color: string;
};
type Overview = { totalEntries: number; postedEntries: number; totalStars: number; topMessage: { sourceMessageId: string; starCount: number } | null };
type Entry = { sourceChannelId: string; sourceMessageId: string; starboardMessageId: string | null; starboardChannelId: string | null; authorId: string; starCount: number; updatedAt: string };

const HEX = /^#[0-9a-f]{6}$/i;

/** Starboard (format Keeper) : salon d'honneur, seuil d'étoiles, règles de décompte et messages mis en avant. */
export default function ConsoleStarboard({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);

  const load = useCallback(async () => {
    const [c, o, e] = await Promise.all([api<Config>("/starboard/config"), api<Overview>("/starboard/overview", { silent: true }), api<{ entries: Entry[] }>("/starboard/entries", { silent: true })]);
    if (c) setCfg(c);
    if (o) setOv(o);
    setEntries(e?.entries ?? []);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const { success: toastSuccess } = useToast();
  const [testing, setTesting] = useState(false);

  const testStarboard = async () => {
    if (!cfg?.channelId) return;
    setTesting(true);
    const r = await api<{ success: boolean; channelName: string }>("/starboard/test", { method: "POST" });
    setTesting(false);
    if (r?.success) {
      toastSuccess("Starboard", `Message de test envoyé dans #${r.channelName} !`);
    }
  };

  const save = async (patch: Partial<Config>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: Config }>("/starboard/config", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };

  if (!cfg) {
    return (
      <ConsolePage title={tx("Starboard")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const channelName = (id: string | null) => (id ? (channels.find((c) => c.id === id)?.name ?? id) : "—");
  const posted = (entries ?? []).filter((e) => e.starboardMessageId).sort((a, b) => b.starCount - a.starCount || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ConsolePage title={tx("Starboard")}>
      {!cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : aucun message n'est mis en avant. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      ) : (
        !cfg.channelId && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Choisis le salon d'honneur : sans salon, le module ne publie rien.")}</p>
          </Panel>
        )
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Messages mis en avant")} value={ov?.postedEntries ?? "—"} />
        <StatTile label={tx("Messages suivis")} value={ov?.totalEntries ?? "—"} hint={tx("Au moins une réaction")} />
        <StatTile label={tx("{emoji} au total", { emoji: cfg.emoji })} value={ov?.totalStars ?? "—"} />
        <StatTile label={tx("Record")} value={ov?.topMessage ? `${ov.topMessage.starCount} ${cfg.emoji}` : "—"} />
      </motion.div>

      <Panel
        title={tx("Mise en avant")}
        actions={
          cfg.channelId ? (
            <GhostButton disabled={testing || !cfg.enabled} onClick={testStarboard}>
              {testing ? tx("Publication…") : tx("Tester la publication")}
            </GhostButton>
          ) : undefined
        }
      >
        <Row label={tx("Salon d'honneur")} hint={tx("Où Etho republie les messages qui atteignent le seuil.")}>
          <ChannelPicker guildId={guildId} value={cfg.channelId ?? ""} filterTypes={[0, 5, 15]} placeholder={tx("Choisir un salon")} onChange={(id) => save({ channelId: id || null })} />
        </Row>
        <Row label={tx("Emoji")} hint={tx("Réaction comptée : emoji Unicode ou personnalisé (<:nom:id>).")}>
          <TextField value={cfg.emoji} maxLength={64} width="w-40" onCommit={(v) => save({ emoji: v })} />
        </Row>
        <Row label={tx("Seuil")} hint={tx("Nombre de réactions pour apparaître dans le salon d'honneur.")}>
          <Stepper value={cfg.threshold} min={1} max={100} unit={tx("réactions")} onCommit={(n) => save({ threshold: n })} />
        </Row>
        <Row label={tx("Couleur de l'embed")}>
          <span className="inline-flex items-center gap-2">
            <input type="color" value={HEX.test(cfg.color) ? cfg.color : "#f5b301"} onChange={(e) => save({ color: e.target.value })} aria-label={tx("Couleur de l'embed")} className="h-8 w-10 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
            <span className="font-mono text-xs text-[var(--text-muted)]">{cfg.color}</span>
          </span>
        </Row>
        <div className="border-t border-[var(--panel-border)] px-5 py-3">
          <p className="mb-2 text-[11px] font-semibold text-[var(--text-muted)]">{tx("Aperçu du rendu Discord")}</p>
          <div
            className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3"
            style={{ borderLeftWidth: "4px", borderLeftColor: HEX.test(cfg.color) ? cfg.color : "#f5b301" }}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--accent-primary)]/30 text-[9px] font-bold text-[var(--accent-primary)]">E</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{tx("Membre du serveur")}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-primary)]">
              {tx("Un message qui a franchi le palier de")}{" "} {cfg.threshold} {cfg.emoji} !
            </p>
            <p className="mt-2 text-[11px] font-mono text-[var(--text-muted)]">
              {cfg.threshold} {cfg.emoji} • #{channelName(cfg.channelId)}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title={tx("Décompte")}>
        <Row label={tx("Retirer sous le seuil")} hint={tx("Le message quitte le salon d'honneur si les réactions repassent sous le seuil.")}>
          <Switch checked={cfg.removeBelowThreshold} onChange={(v) => save({ removeBelowThreshold: v })} label={tx("Retirer sous le seuil")} />
        </Row>
        <Row label={tx("Auto-étoile")} hint={tx("L'auteur peut réagir à son propre message et compter dans le total.")}>
          <Switch checked={cfg.selfStarAllowed} onChange={(v) => save({ selfStarAllowed: v })} label={tx("Auto-étoile")} />
        </Row>
        <Row label={tx("Ignorer les bots")} hint={tx("Les réactions des bots ne comptent pas.")}>
          <Switch checked={cfg.ignoreBots} onChange={(v) => save({ ignoreBots: v })} label={tx("Ignorer les bots")} />
        </Row>
        <Row label={tx("Salons NSFW")} hint={tx("Les messages des salons NSFW peuvent aussi être mis en avant.")}>
          <Switch checked={cfg.allowNsfw} onChange={(v) => save({ allowNsfw: v })} label={tx("Salons NSFW")} />
        </Row>
        <Row label={tx("Salons ignorés")} hint={tx("Leurs messages ne sont jamais mis en avant.")}>
          <div className="flex flex-wrap items-center gap-1.5">
            {cfg.ignoredChannelIds.map((id) => (
              <Chip key={id} label={`#${channelName(id)}`} onRemove={() => save({ ignoredChannelIds: cfg.ignoredChannelIds.filter((x) => x !== id) })} />
            ))}
            <ChannelAdder guildId={guildId} excludeIds={cfg.ignoredChannelIds} onPick={(c) => save({ ignoredChannelIds: [...cfg.ignoredChannelIds, c.id] })} />
          </div>
        </Row>
      </Panel>

      <Panel title={tx("Messages mis en avant")} subtitle={tx("Les plus étoilés d'abord.")}>
        {!entries ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : posted.length === 0 ? (
          <EmptyLine>{tx("Aucun message n'a encore atteint le seuil.")}</EmptyLine>
        ) : (
          <ul>
            {posted.slice(0, 50).map((e) => (
              <li key={e.sourceMessageId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="w-14 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                  {e.starCount} <span className="text-xs">{cfg.emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">#{channelName(e.sourceChannelId)}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{tx("Mis à jour")}{" "} {sinceLabel(e.updatedAt)}</p>
                </div>
                <a
                  href={`https://discord.com/channels/${guildId}/${e.sourceChannelId}/${e.sourceMessageId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  {tx("Voir le message")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
