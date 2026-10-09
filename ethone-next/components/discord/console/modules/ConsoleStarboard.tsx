"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { ChannelAdder, Chip, ConsolePage, EmptyLine, Panel, Row, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";

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

  const save = async (patch: Partial<Config>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: Config }>("/starboard/config", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };

  if (!cfg) {
    return (
      <ConsolePage title="Starboard">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const channelName = (id: string | null) => (id ? (channels.find((c) => c.id === id)?.name ?? id) : "—");
  const posted = (entries ?? []).filter((e) => e.starboardMessageId).sort((a, b) => b.starCount - a.starCount || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ConsolePage title="Starboard">
      {!cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : aucun message n&apos;est mis en avant. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      ) : (
        !cfg.channelId && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">Choisis le salon d&apos;honneur : sans salon, le module ne publie rien.</p>
          </Panel>
        )
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Messages mis en avant" value={ov?.postedEntries ?? "—"} />
        <StatTile label="Messages suivis" value={ov?.totalEntries ?? "—"} hint="Au moins une réaction" />
        <StatTile label={`${cfg.emoji} au total`} value={ov?.totalStars ?? "—"} />
        <StatTile label="Record" value={ov?.topMessage ? `${ov.topMessage.starCount} ${cfg.emoji}` : "—"} />
      </motion.div>

      <Panel title="Mise en avant">
        <Row label="Salon d'honneur" hint="Où Etho republie les messages qui atteignent le seuil.">
          <ChannelPicker guildId={guildId} value={cfg.channelId ?? ""} filterTypes={[0, 5, 15]} placeholder="Choisir un salon" onChange={(id) => save({ channelId: id || null })} />
        </Row>
        <Row label="Emoji" hint="Réaction comptée : emoji Unicode ou personnalisé (<:nom:id>).">
          <TextField value={cfg.emoji} maxLength={64} width="w-40" onCommit={(v) => save({ emoji: v })} />
        </Row>
        <Row label="Seuil" hint="Nombre de réactions pour apparaître dans le salon d'honneur.">
          <Stepper value={cfg.threshold} min={1} max={100} unit="réactions" onCommit={(n) => save({ threshold: n })} />
        </Row>
        <Row label="Couleur de l'embed">
          <span className="inline-flex items-center gap-2">
            <input type="color" value={HEX.test(cfg.color) ? cfg.color : "#f5b301"} onChange={(e) => save({ color: e.target.value })} aria-label="Couleur de l'embed" className="h-8 w-10 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent" />
            <span className="font-mono text-xs text-[var(--text-muted)]">{cfg.color}</span>
          </span>
        </Row>
      </Panel>

      <Panel title="Décompte">
        <Row label="Retirer sous le seuil" hint="Le message quitte le salon d'honneur si les réactions repassent sous le seuil.">
          <Switch checked={cfg.removeBelowThreshold} onChange={(v) => save({ removeBelowThreshold: v })} label="Retirer sous le seuil" />
        </Row>
        <Row label="Auto-étoile" hint="L'auteur peut réagir à son propre message et compter dans le total.">
          <Switch checked={cfg.selfStarAllowed} onChange={(v) => save({ selfStarAllowed: v })} label="Auto-étoile" />
        </Row>
        <Row label="Ignorer les bots" hint="Les réactions des bots ne comptent pas.">
          <Switch checked={cfg.ignoreBots} onChange={(v) => save({ ignoreBots: v })} label="Ignorer les bots" />
        </Row>
        <Row label="Salons NSFW" hint="Les messages des salons NSFW peuvent aussi être mis en avant.">
          <Switch checked={cfg.allowNsfw} onChange={(v) => save({ allowNsfw: v })} label="Salons NSFW" />
        </Row>
        <Row label="Salons ignorés" hint="Leurs messages ne sont jamais mis en avant.">
          <div className="flex flex-wrap items-center gap-1.5">
            {cfg.ignoredChannelIds.map((id) => (
              <Chip key={id} label={`#${channelName(id)}`} onRemove={() => save({ ignoredChannelIds: cfg.ignoredChannelIds.filter((x) => x !== id) })} />
            ))}
            <ChannelAdder guildId={guildId} excludeIds={cfg.ignoredChannelIds} onPick={(c) => save({ ignoredChannelIds: [...cfg.ignoredChannelIds, c.id] })} />
          </div>
        </Row>
      </Panel>

      <Panel title="Messages mis en avant" subtitle="Les plus étoilés d'abord.">
        {!entries ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : posted.length === 0 ? (
          <EmptyLine>Aucun message n&apos;a encore atteint le seuil.</EmptyLine>
        ) : (
          <ul>
            {posted.slice(0, 50).map((e) => (
              <li key={e.sourceMessageId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="w-14 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                  {e.starCount} <span className="text-xs">{cfg.emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">#{channelName(e.sourceChannelId)}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">Mis à jour {sinceLabel(e.updatedAt)}</p>
                </div>
                <a
                  href={`https://discord.com/channels/${guildId}/${e.sourceChannelId}/${e.sourceMessageId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  Voir le message
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
