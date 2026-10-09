"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Switch, useGuildApi } from "../kit";

type Config = { enabled: boolean; channelId: string | null; allowConsecutive: boolean; resetOnMistake: boolean; count: number; highScore: number; totalCorrect: number; totalMistakes: number; lastResetAt: string | null };
type Overview = { config: Config; leaderboard: { userId: string; correct: number; mistakes: number; name: string; avatarUrl: string | null }[] };

/** Compteur (format Keeper) : salon de comptage, règles et meilleurs compteurs. */
export default function ConsoleCounting({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [ov, setOv] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    const r = await api<Overview>("/counting/overview");
    if (r) setOv(r);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<Pick<Config, "channelId" | "allowConsecutive" | "resetOnMistake">>) => {
    if (patch.channelId !== undefined && ov?.config.channelId && patch.channelId !== ov.config.channelId && ov.config.count > 0) {
      if (!(await confirmDialog(`Changer de salon remet le compteur à 0 (il est à ${ov.config.count}).`, { title: "Changer de salon", confirmLabel: "Changer" }))) return;
    }
    setOv((o) => (o ? { ...o, config: { ...o.config, ...patch } } : o));
    const r = await api<Overview>("/counting/config", { method: "PUT", json: patch });
    if (r) setOv(r);
    else void load();
  };
  const reset = async () => {
    if (!(await confirmDialog("Remettre le compteur à 0 ? Le record est conservé.", { title: "Remettre à zéro", confirmLabel: "Remettre à 0" }))) return;
    const r = await api<Overview>("/counting/reset", { method: "POST" });
    if (r) setOv(r);
  };

  const cfg = ov?.config;
  return (
    <ConsolePage title="Compteur">
      {cfg && !cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : Etho ne vérifie pas le comptage. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      ) : (
        cfg &&
        !cfg.channelId && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">Choisis le salon de comptage.</p>
          </Panel>
        )
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Nombre actuel" value={cfg?.count ?? "—"} hint={cfg ? `Prochain : ${cfg.count + 1}` : undefined} />
        <StatTile label="Record" value={cfg?.highScore ?? "—"} />
        <StatTile label="Bons nombres" value={cfg?.totalCorrect ?? "—"} />
        <StatTile label="Erreurs" value={cfg?.totalMistakes ?? "—"} hint={cfg?.lastResetAt ? `Dernière remise à 0 ${sinceLabel(cfg.lastResetAt)}` : undefined} />
      </motion.div>

      <Panel title="Règles" actions={cfg && <GhostButton onClick={reset}>Remettre à 0</GhostButton>}>
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Salon de comptage" hint="Changer de salon repart de 0.">
              <ChannelPicker guildId={guildId} value={cfg.channelId ?? ""} filterTypes={[0]} placeholder="Choisir un salon" onChange={(id) => save({ channelId: id || null })} />
            </Row>
            <Row label="Deux fois de suite" hint="Un membre peut écrire deux nombres d'affilée.">
              <Switch checked={cfg.allowConsecutive} onChange={(v) => save({ allowConsecutive: v })} label="Deux fois de suite" />
            </Row>
            <Row label="Erreur = retour à 0" hint="Sinon, le mauvais nombre est supprimé et le compte continue.">
              <Switch checked={cfg.resetOnMistake} onChange={(v) => save({ resetOnMistake: v })} label="Erreur = retour à 0" />
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Meilleurs compteurs">
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : ov.leaderboard.length === 0 ? (
          <EmptyLine>Personne n&apos;a encore compté.</EmptyLine>
        ) : (
          <ul>
            {ov.leaderboard.slice(0, 20).map((m, i) => (
              <li key={m.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-[var(--panel-border)]" />}
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.name}</p>
                <span className="text-xs tabular-nums text-[var(--text-primary)]">{m.correct}</span>
                <span className="w-16 text-right text-[11px] tabular-nums text-[var(--danger)]">{m.mistakes ? `${m.mistakes} erreur${m.mistakes > 1 ? "s" : ""}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
