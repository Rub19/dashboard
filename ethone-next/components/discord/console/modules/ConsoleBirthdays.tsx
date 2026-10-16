"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, StatTile, Stepper, Switch, useGuildApi, useMemberNames } from "../kit";
import { tx } from "@/lib/tx";

type Config = { enabled: boolean; announceChannelId: string | null; announceHour: number; message: string; birthdayRoleId: string | null; mentionUser: boolean };
type Overview = { total: number; today: { userId: string; age: number | null }[]; upcoming: { userId: string; day: number; month: number; inDays: number }[] };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Anniversaires (format Keeper) : annonce du jour, rôle d'anniversaire et prochains anniversaires. */
export default function ConsoleBirthdays({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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

  const testAnnounce = async () => {
    setBusy("test");
    const r = await api<{ success: boolean }>("/birthdays/test", { method: "POST" });
    setBusy(null);
    if (r?.success) {
      setNote("Message de test envoyé avec succès sur Discord !");
    } else {
      setNote("Échec de l'envoi du test. Vérifie les permissions d'Etho dans le salon d'annonce.");
    }
  };

  const deleteBirthday = async (userId: string) => {
    if (!(await confirmDialog(tx("Retirer l'anniversaire de {v0} ?", { v0: name(userId) }), { title: tx("Retirer l'anniversaire"), confirmLabel: tx("Retirer") }))) return;
    setBusy(`del:${userId}`);
    const r = await api<{ success: boolean }>(`/birthdays/${userId}`, { method: "DELETE" });
    setBusy(null);
    if (r?.success) {
      void load();
    }
  };

  return (
    <ConsolePage title={tx("Anniversaires")}>
      {cfg && !cfg.enabled ? (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : aucun anniversaire n'est annoncé. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      ) : (
        cfg &&
        !cfg.announceChannelId && (
          <Panel>
            <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Choisis le salon d'annonce : sans salon, rien n'est publié.")}</p>
          </Panel>
        )
      )}

      {note && (
        <Panel>
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <button type="button" onClick={() => setNote(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {tx("Fermer")}
            </button>
          </div>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label={tx("Anniversaires enregistrés")} value={ov?.total ?? "—"} hint={tx("Ajoutés par les membres avec /birthday set")} />
        <StatTile label={tx("Aujourd'hui")} value={ov?.today.length ?? "—"} />
        <StatTile label={tx("Prochain")} value={ov?.upcoming[0] ? (ov.upcoming[0].inDays === 0 ? "Aujourd'hui" : `Dans ${ov.upcoming[0].inDays} j`) : "—"} hint={ov?.upcoming[0] ? name(ov.upcoming[0].userId) : undefined} />
      </motion.div>

      <Panel
        title={tx("Annonce")}
        actions={
          <GhostButton disabled={busy !== null || !cfg?.announceChannelId} onClick={testAnnounce}>
            {busy === "test" ? tx("Envoi…") : tx("Tester l'annonce")}
          </GhostButton>
        }
      >
        {!cfg ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : (
          <>
            <Row label={tx("Salon")}>
              <ChannelPicker guildId={guildId} value={cfg.announceChannelId ?? ""} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => save({ announceChannelId: id || null })} />
            </Row>
            <Row label={tx("Heure")} hint={tx("Heure de l'annonce, chaque jour.")}>
              <Stepper value={cfg.announceHour} min={0} max={23} unit="h" onCommit={(n) => save({ announceHour: n })} />
            </Row>
            <Row label={tx("Message")} hint={tx("Variables : {user} (le membre), {age} (si l'année est connue).")}>
              <textarea
                value={message}
                maxLength={500}
                rows={2}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => message.trim() && message !== cfg.message && save({ message: message.trim() })}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
              />
            </Row>
            <Row label={tx("Mentionner le membre")} hint={tx("Sinon son nom est affiché sans le notifier.")}>
              <Switch checked={cfg.mentionUser} onChange={(v) => save({ mentionUser: v })} label={tx("Mentionner le membre")} />
            </Row>
            <Row label={tx("Rôle du jour")} hint={tx("Donné le jour de l'anniversaire, retiré le lendemain.")}>
              <RoleChips guildId={guildId} ids={cfg.birthdayRoleId ? [cfg.birthdayRoleId] : []} max={1} onChange={(ids) => save({ birthdayRoleId: ids[0] ?? null })} />
            </Row>
          </>
        )}
      </Panel>

      <Panel title={tx("Prochains anniversaires")}>
        {!ov ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : ov.today.length + ov.upcoming.length === 0 ? (
          <EmptyLine>{tx("Aucun anniversaire enregistré.")}</EmptyLine>
        ) : (
          <ul>
            {ov.today.map((t) => (
              <li key={`t-${t.userId}`} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <span className="w-16 shrink-0 text-center text-xs font-bold text-[var(--success)]">{tx("Aujourd'hui")}</span>
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  🎂 {name(t.userId)}
                  {t.age !== null && <span className="font-normal text-[var(--text-muted)]"> · {t.age} {" "}{tx("ans")}</span>}
                </p>
                <button
                  type="button"
                  title={tx("Retirer l'anniversaire de {v0}", { v0: name(t.userId) })}
                  disabled={busy !== null}
                  onClick={() => deleteBirthday(t.userId)}
                  className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                >
                  ×
                </button>
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
                  <span className="text-[11px] text-[var(--text-muted)]">{tx("dans")}{" "} {u.inDays} j</span>
                  <button
                    type="button"
                    title={tx("Retirer l'anniversaire de {v0}", { v0: name(u.userId) })}
                    disabled={busy !== null}
                    onClick={() => deleteBirthday(u.userId)}
                    className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
