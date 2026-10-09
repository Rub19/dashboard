"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { pageStagger } from "@/lib/motion-variants";
import { ChannelAdder, Chip, ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Switch, useGuildApi } from "../kit";

type Overview = { totalWatchers: number; totalKeywords: number; pausedWatchers: number };
type Mine = { config: { enabled: boolean; ignoredChannelIds: string[] }; keywords: { keyword: string }[]; maxKeywords: number };

/**
 * Highlights (format Keeper) : chiffres du serveur et mots-clés de la personne connectée. Les mots-clés des autres
 * membres restent privés, même pour un administrateur (le bot ne les renvoie jamais).
 */
export default function ConsoleHighlights({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, m] = await Promise.all([api<Overview>("/highlights/overview", { silent: true }), api<Mine>("/highlights/mine")]);
    if (o) setOv(o);
    if (m) setMine(m);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const saveConfig = async (patch: Partial<Mine["config"]>) => {
    setMine((m) => (m ? { ...m, config: { ...m.config, ...patch } } : m));
    const r = await api<{ config: Mine["config"] }>("/highlights/mine/config", { method: "PUT", json: patch });
    if (r) setMine((m) => (m ? { ...m, config: r.config } : m));
  };
  const add = async () => {
    setBusy(true);
    const r = await api<{ keyword: { keyword: string } }>("/highlights/mine/keywords", { method: "POST", json: { keyword: word.trim() } });
    setBusy(false);
    if (r) {
      setMine((m) => (m ? { ...m, keywords: [...m.keywords, r.keyword].sort((a, b) => a.keyword.localeCompare(b.keyword)) } : m));
      setWord("");
      api<Overview>("/highlights/overview", { silent: true }).then((o) => o && setOv(o));
    }
  };
  const remove = async (k: string) => {
    if (await api(`/highlights/mine/keywords/${encodeURIComponent(k)}`, { method: "DELETE" })) setMine((m) => (m ? { ...m, keywords: m.keywords.filter((x) => x.keyword !== k) } : m));
  };

  const full = !!mine && mine.keywords.length >= mine.maxKeywords;
  const valid = word.trim().length >= 2 && word.trim().length <= 50;

  return (
    <ConsolePage title="Highlights">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Membres qui surveillent" value={ov?.totalWatchers ?? "—"} hint={ov?.pausedWatchers ? `dont ${ov.pausedWatchers} en pause` : undefined} />
        <StatTile label="Mots-clés suivis" value={ov?.totalKeywords ?? "—"} />
        <StatTile label="Mes mots-clés" value={mine ? `${mine.keywords.length}/${mine.maxKeywords}` : "—"} />
      </motion.div>

      <Panel title="Mes alertes" subtitle="Etho t'envoie un message privé quand un de tes mots-clés est écrit sur le serveur. Les mots-clés des autres membres restent privés.">
        {!mine ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Recevoir les alertes">
              <Switch checked={mine.config.enabled} onChange={(v) => saveConfig({ enabled: v })} label="Recevoir les alertes" />
            </Row>
            <Row label="Mots-clés" hint="De 2 à 50 caractères.">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {mine.keywords.length === 0 && <span className="text-xs text-[var(--text-muted)]">Aucun mot-clé.</span>}
                  {mine.keywords.map((k) => (
                    <Chip key={k.keyword} label={k.keyword} onRemove={() => remove(k.keyword)} />
                  ))}
                </div>
                {!full && (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={word}
                      maxLength={50}
                      onChange={(e) => setWord(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && valid && !busy && add()}
                      placeholder="Nouveau mot-clé"
                      aria-label="Nouveau mot-clé"
                      className="h-8 w-48 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                    />
                    <GhostButton disabled={!valid || busy} onClick={add}>
                      Ajouter
                    </GhostButton>
                  </div>
                )}
              </div>
            </Row>
            <Row label="Salons ignorés" hint="Aucune alerte pour les messages de ces salons.">
              <div className="flex flex-wrap items-center gap-1.5">
                {mine.config.ignoredChannelIds.map((id) => (
                  <Chip key={id} label={`#${channelName(id)}`} onRemove={() => saveConfig({ ignoredChannelIds: mine.config.ignoredChannelIds.filter((x) => x !== id) })} />
                ))}
                <ChannelAdder guildId={guildId} excludeIds={mine.config.ignoredChannelIds} onPick={(c) => saveConfig({ ignoredChannelIds: [...mine.config.ignoredChannelIds, c.id] })} />
              </div>
            </Row>
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
