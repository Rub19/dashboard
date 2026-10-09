"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, Panel, RoleChips, Row, StatTile, Stepper, Switch, useGuildApi, useMemberNames } from "../kit";

type Config = { enabled: boolean; announceChannelId: string | null; announceHour: number; message: string; birthdayRoleId: string | null; mentionUser: boolean };
type Overview = { total: number; today: { userId: string; age: number | null }[]; upcoming: { userId: string; day: number; month: number; inDays: number }[] };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Anniversaires (format Keeper) : annonce du jour, rôle d'anniversaire et prochains anniversaires. */
export default function ConsoleBirthdays({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [c, o] = await Promise.all([api<Config>("/birthdays/config"), api<Overview>("/birthdays/overview", { silent: true })]);
    if (c) {
      setCfg(c);
      setMessage(c.message);
    }
    setOv(o ?? { total: 0, today: [], upcoming: [] });
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const names = useMemberNames(guildId, [...(ov?.today.map((t) => t.userId) ?? []), ...(ov?.upcoming.map((u) => u.userId) ?? [])]);
  const name = (id: string) => names[id]?.displayName ?? id;

  const save = async (patch: Partial<Config>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: Config }>("/birthdays/config", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };

  return (
    <ConsolePage title="Anniversaires">
      {cfg && !cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : aucun anniversaire n&apos;est annoncé. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      ) : (
        cfg &&
        !cfg.announceChannelId && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">Choisis le salon d&apos;annonce : sans salon, rien n&apos;est publié.</p>
          </Panel>
        )
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Anniversaires enregistrés" value={ov?.total ?? "—"} hint="Ajoutés par les membres avec /birthday set" />
        <StatTile label="Aujourd'hui" value={ov?.today.length ?? "—"} />
        <StatTile label="Prochain" value={ov?.upcoming[0] ? (ov.upcoming[0].inDays === 0 ? "Aujourd'hui" : `Dans ${ov.upcoming[0].inDays} j`) : "—"} hint={ov?.upcoming[0] ? name(ov.upcoming[0].userId) : undefined} />
      </motion.div>

      <Panel title="Annonce">
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Salon">
              <ChannelPicker guildId={guildId} value={cfg.announceChannelId ?? ""} filterTypes={[0, 5]} placeholder="Choisir un salon" onChange={(id) => save({ announceChannelId: id || null })} />
            </Row>
            <Row label="Heure" hint="Heure de l'annonce, chaque jour.">
              <Stepper value={cfg.announceHour} min={0} max={23} unit="h" onCommit={(n) => save({ announceHour: n })} />
            </Row>
            <Row label="Message" hint="Variables : {user} (le membre), {age} (si l'année est connue).">
              <textarea
                value={message}
                maxLength={500}
                rows={2}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => message.trim() && message !== cfg.message && save({ message: message.trim() })}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
              />
            </Row>
            <Row label="Mentionner le membre" hint="Sinon son nom est affiché sans le notifier.">
              <Switch checked={cfg.mentionUser} onChange={(v) => save({ mentionUser: v })} label="Mentionner le membre" />
            </Row>
            <Row label="Rôle du jour" hint="Donné le jour de l'anniversaire, retiré le lendemain.">
              <RoleChips guildId={guildId} ids={cfg.birthdayRoleId ? [cfg.birthdayRoleId] : []} max={1} onChange={(ids) => save({ birthdayRoleId: ids[0] ?? null })} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Prochains anniversaires">
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : ov.today.length + ov.upcoming.length === 0 ? (
          <EmptyLine>Aucun anniversaire enregistré.</EmptyLine>
        ) : (
          <ul>
            {ov.today.map((t) => (
              <li key={`t-${t.userId}`} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="w-16 shrink-0 text-center text-xs font-bold text-[var(--success)]">Aujourd&apos;hui</span>
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  🎂 {name(t.userId)}
                  {t.age !== null && <span className="font-normal text-[var(--text-muted)]"> · {t.age} ans</span>}
                </p>
              </li>
            ))}
            {ov.upcoming
              .filter((u) => u.inDays > 0)
              .map((u) => (
                <li key={`u-${u.userId}`} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <span className="w-16 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                    {u.day} {MONTHS[u.month - 1]}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">{name(u.userId)}</p>
                  <span className="text-[11px] text-[var(--text-muted)]">dans {u.inDays} j</span>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
