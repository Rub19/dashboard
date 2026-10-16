"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Stepper, Switch, useGuildApi, useMemberNames } from "../kit";
import { tx } from "@/lib/tx";

type Config = { enabled: boolean; clearOnMessage: boolean; notifyOnMention: boolean; prefixNickname: boolean; autoDeleteSeconds: number };
type Overview = { activeCount: number; totalMentionsWhileAway: number; members: { userId: string; reason: string; since: string; mentionCount: number }[] };

/** AFK (format Keeper) : comportement de /afk et membres actuellement absents. */
export default function ConsoleAfk({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    const [c, o] = await Promise.all([api<Config>("/afk/config"), api<Overview>("/afk/overview", { silent: true })]);
    if (c) setCfg(c);
    setOv(o ?? { activeCount: 0, totalMentionsWhileAway: 0, members: [] });
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const names = useMemberNames(guildId, ov?.members.map((m) => m.userId) ?? []);

  const save = async (patch: Partial<Config>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: Config }>("/afk/config", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };
  const clear = async (userId: string) => {
    if (await api(`/afk/entries/${userId}`, { method: "DELETE" })) void load();
  };

  return (
    <ConsolePage title="AFK">
      {cfg && !cfg.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : /afk ne fonctionne pas. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3">
        <StatTile label={tx("Membres absents")} value={ov?.activeCount ?? "—"} />
        <StatTile label={tx("Mentions pendant l'absence")} value={ov?.totalMentionsWhileAway ?? "—"} />
      </motion.div>

      <Panel title={tx("Comportement")}>
        {!cfg ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            <Row label={tx("Retour automatique")} hint={tx("Le statut AFK est retiré dès que le membre écrit un message.")}>
              <Switch checked={cfg.clearOnMessage} onChange={(v) => save({ clearOnMessage: v })} label={tx("Retour automatique")} />
            </Row>
            <Row label={tx("Répondre aux mentions")} hint={tx("Etho prévient qu'un membre mentionné est absent, avec sa raison.")}>
              <Switch checked={cfg.notifyOnMention} onChange={(v) => save({ notifyOnMention: v })} label={tx("Répondre aux mentions")} />
            </Row>
            <Row label={tx("Préfixe [AFK]")} hint={tx("Ajoute [AFK] devant le pseudo (permission « Gérer les pseudos »).")}>
              <Switch checked={cfg.prefixNickname} onChange={(v) => save({ prefixNickname: v })} label={tx("Préfixe [AFK]")} />
            </Row>
            <Row label={tx("Effacer les réponses d'Etho")} hint={tx("0 = les réponses restent.")}>
              <Stepper value={cfg.autoDeleteSeconds} min={0} max={60} unit="secondes" onCommit={(n) => save({ autoDeleteSeconds: n })} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title={tx("Membres absents")}>
        {!ov ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : ov.members.length === 0 ? (
          <EmptyLine>{tx("Personne n'est AFK en ce moment.")}</EmptyLine>
        ) : (
          <ul>
            {ov.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{names[m.userId]?.displayName ?? m.userId}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {m.reason} {" "}{tx("· parti")}{" "} {sinceLabel(m.since)} · {m.mentionCount} {" "}{tx("mention")}{m.mentionCount > 1 ? "s" : ""}
                  </p>
                </div>
                <GhostButton onClick={() => clear(m.userId)}>{tx("Retirer")}</GhostButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
