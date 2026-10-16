"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import ChannelPicker from "../../ChannelPicker";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, Select, Stepper, Switch, useGuildApi } from "../kit";
import { DURATIONS, EXPIRY_DAYS, INPUT, PageTitle, SEVERITIES, SavingBadge, useSanctionConfig, type Severity } from "../sanctions/shared";
import { tx } from "@/lib/tx";

type Tier = { id: string; enabled: boolean; count: number; unit: "infractions" | "points"; scope: "warns" | "protection" | "automod" | "all"; periodSeconds: number; action: "TIMEOUT" | "KICK" | "TEMPBAN" | "BAN"; durationSeconds: number; reason: string };
type Cfg = {
  tiers: Tier[];
  warnings: { severityEnabled: boolean; points: Record<Severity, number>; defaultSeverity: Severity; expiryDays: number; autoPoints: { protection: number; automod: number }; goodConduct: { enabled: boolean; points: number; periodDays: number } };
  replies: { dmMember: boolean; nameModerator: boolean; hideReplies: boolean; undoButton: boolean; requireReason: boolean; publicByDefault: boolean; endReminder: boolean };
  history: { protection: boolean; automod: boolean; discord: boolean; joins: boolean };
  guard: { enabled: boolean; perHour: number; alertChannelId: string | null };
  [k: string]: unknown;
};

const PERIODS: ReadonlyArray<readonly [number, string]> = [
  [0, "depuis toujours"],
  [600, "en 10 minutes"],
  [3600, "en 1 heure"],
  [21600, "en 6 heures"],
  [43200, "en 12 heures"],
  [86400, "en 1 jour"],
  [259200, "en 3 jours"],
  [604800, "en 7 jours"],
  [1209600, "en 14 jours"],
  [2592000, "en 30 jours"],
  [7776000, "en 90 jours"],
];

const STEPS = [
  ["Un avertissement", "vaut des points selon sa gravité."],
  ["Les points s'additionnent", "et chaque avertissement expire selon ton réglage."],
  ["Un palier franchi", "sanctionne le membre tout seul, une seule fois."],
] as const;

/** Avertissements et paliers (format Keeper) : tout est gratuit, y compris bonne conduite, rappel de fin et garde-fou. */
export default function ConsoleWarnings({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { cfg, set, status } = useSanctionConfig<Cfg>(guildId);
  const [modLog, setModLog] = useState<string | null>(null);
  useEffect(() => {
    api<{ modLogChannelId: string | null }>("/moderation/mod-log-channel", { silent: true }).then((r) => r && setModLog(r.modLogChannelId));
  }, [api]);

  if (!cfg)
    return (
      <ConsolePage title={tx("Avertissements et paliers")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );

  const w = cfg.warnings;
  const r = cfg.replies;
  const h = cfg.history;
  const g = cfg.guard;
  const setW = (p: Partial<Cfg["warnings"]>) => set("warnings", { ...w, ...p });
  const setR = (p: Partial<Cfg["replies"]>) => set("replies", { ...r, ...p });
  const setH = (p: Partial<Cfg["history"]>) => set("history", { ...h, ...p });
  const setG = (p: Partial<Cfg["guard"]>) => set("guard", { ...g, ...p });
  const setTier = (id: string, p: Partial<Tier>) => set("tiers", cfg.tiers.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...cfg.tiers];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set("tiers", next);
  };
  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void, hint?: string) => (
    <Row label={label} hint={hint}>
      <Switch checked={value} onChange={onChange} label={label} />
    </Row>
  );

  return (
    <ConsolePage title={<PageTitle title={tx("Avertissements et paliers")} text={tx("Les avertissements comptent des points, et les paliers sanctionnent automatiquement les récidivistes.")} />} actions={<SavingBadge text={status} />}>
      <motion.div variants={pageStagger} className="grid gap-3 sm:grid-cols-3">
        {STEPS.map(([b, t], i) => (
          <motion.div key={b} variants={staggerItem} className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--success)]/15 text-[11px] font-bold text-[var(--success)]">{i + 1}</span>
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">{b}</span> {t}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <Panel title={tx("Paliers automatiques · {length}/10", { length: cfg.tiers.length })} subtitle={tx("Après chaque infraction, Etho applique le plus haut palier qu'elle vient de franchir, une seule fois. Un membre déjà muet plus longtemps ou déjà banni n'est pas sanctionné à nouveau.")}>
        <div className="space-y-2.5 p-4">
          {cfg.tiers.length === 0 && <p className="text-xs text-[var(--text-muted)]">{tx("Aucun palier. Exemple : 3 avertissements, mute 1 heure ; 5, ban 1 jour.")}</p>}
          <AnimatePresence initial={false}>
            {cfg.tiers.map((t, i) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className={cn("space-y-2 rounded-xl border border-[var(--panel-border)] p-3 transition-opacity", !t.enabled && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-hover)] text-[10px] font-bold text-[var(--text-primary)]">{i + 1}</span>À
                  <input type="number" min={1} max={1000} value={t.count} onChange={(e) => setTier(t.id, { count: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} aria-label={tx("Seuil")} className={cn(INPUT, "h-8 w-16 text-center font-mono")} />
                  <Select size="sm" value={t.unit} aria-label={tx("Compté en")} options={[["infractions", "infractions"], ["points", "points"]]} onChange={(v) => setTier(t.id, { unit: v })} />
                  {tx("de")}
                  <Select size="sm" value={t.scope} aria-label={tx("Infractions comptées")} options={[["warns", "avertissements"], ["protection", "infractions de la protection"], ["automod", "infractions AutoMod"], ["all", "infractions de toute sorte"]]} onChange={(v) => setTier(t.id, { scope: v })} />
                  <Select size="sm" value={t.periodSeconds} aria-label={tx("Période")} options={PERIODS} onChange={(v) => setTier(t.id, { periodSeconds: v })} />
                  <span className="ml-auto flex items-center gap-1">
                    <Switch checked={t.enabled} onChange={(v) => setTier(t.id, { enabled: v })} label={tx("Palier actif")} />
                    <button type="button" aria-label={tx("Monter")} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 hover:text-[var(--text-primary)] disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={tx("Descendre")} disabled={i === cfg.tiers.length - 1} onClick={() => move(i, 1)} className="rounded p-1 hover:text-[var(--text-primary)] disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={tx("Supprimer le palier")} onClick={() => set("tiers", cfg.tiers.filter((x) => x.id !== t.id))} className="rounded p-1 text-[var(--danger)] hover:bg-[var(--danger)]/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-7 text-xs text-[var(--text-muted)]">
                  {tx("Sanction :")}
                  <Select size="sm" value={t.action} aria-label={tx("Sanction")} options={[["TIMEOUT", "Mute"], ["KICK", "Expulsion"], ["TEMPBAN", "Ban temporaire"], ["BAN", "Bannissement"]]} onChange={(v) => setTier(t.id, { action: v })} />
                  {(t.action === "TIMEOUT" || t.action === "TEMPBAN") && <Select size="sm" value={t.durationSeconds} aria-label={tx("Durée")} options={DURATIONS} onChange={(v) => setTier(t.id, { durationSeconds: v })} />}
                  <input value={t.reason} maxLength={300} onChange={(e) => setTier(t.id, { reason: e.target.value })} placeholder={tx("Raison (sinon : « Palier automatique… »)")} className={cn(INPUT, "h-8 min-w-0 flex-1 text-xs")} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cfg.tiers.length < 10 && (
            <GhostButton onClick={() => set("tiers", [...cfg.tiers, { id: Math.random().toString(36).slice(2, 10), enabled: true, count: 3, unit: "infractions", scope: "warns", periodSeconds: 0, action: "TIMEOUT", durationSeconds: 3600, reason: "" }])}>
              <Plus className="h-3.5 w-3.5" />
              {tx("Ajouter un palier")}
            </GhostButton>
          )}
        </div>
      </Panel>

      <Panel title={tx("Avertissements")}>
        {toggle("Gravité", w.severityEnabled, (v) => setW({ severityEnabled: v }), "Légère, moyenne ou grave : chaque gravité vaut un nombre de points. Désactivée, chaque avertissement vaut 1 point (ou ceux de sa raison prédéfinie).")}
        <AnimatePresence initial={false}>
          {w.severityEnabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Row label={tx("Points par gravité")} hint={tx("Une raison prédéfinie peut avoir ses propres points.")}>
                <div className="flex flex-wrap items-center gap-4">
                  {SEVERITIES.map(([s, label]) => (
                    <span key={s} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      {label}
                      <Stepper value={w.points[s]} min={0} max={100} onCommit={(n) => setW({ points: { ...w.points, [s]: n } })} />
                    </span>
                  ))}
                </div>
              </Row>
              <Row label={tx("Gravité par défaut")}>
                <Segmented label={tx("Gravité par défaut")} value={w.defaultSeverity} options={SEVERITIES} onChange={(v) => setW({ defaultSeverity: v })} />
              </Row>
            </motion.div>
          )}
        </AnimatePresence>
        <Row label={tx("Expiration")} hint={tx("Un avertissement expiré reste dans l'historique mais ne compte plus pour les paliers.")}>
          <Select value={w.expiryDays} options={EXPIRY_DAYS} onChange={(v) => setW({ expiryDays: v })} aria-label={tx("Expiration")} />
        </Row>
        <Row label={tx("Infractions automatiques")} hint={tx("Points d'une infraction de la protection Etho (spam, lien, mention…) et d'une règle AutoMod.")}>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              {tx("Protection")}
              <Stepper value={w.autoPoints.protection} min={0} max={100} onCommit={(n) => setW({ autoPoints: { ...w.autoPoints, protection: n } })} />
            </span>
            <span className="flex items-center gap-2">
              {tx("AutoMod")}
              <Stepper value={w.autoPoints.automod} min={0} max={100} onCommit={(n) => setW({ autoPoints: { ...w.autoPoints, automod: n } })} />
            </span>
          </div>
        </Row>
        <Row label={tx("Bonne conduite")} hint={tx("Les points baissent tout seuls quand le membre reste sans infraction.")}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <Switch checked={w.goodConduct.enabled} onChange={(v) => setW({ goodConduct: { ...w.goodConduct, enabled: v } })} label={tx("Bonne conduite")} />
            −
            <Stepper value={w.goodConduct.points} min={1} max={100} disabled={!w.goodConduct.enabled} onCommit={(n) => setW({ goodConduct: { ...w.goodConduct, points: n } })} />
            {tx("point tous les")}
            <Select size="sm" value={w.goodConduct.periodDays} disabled={!w.goodConduct.enabled} aria-label={tx("Période de bonne conduite")} options={[[7, "7 jours"], [14, "14 jours"], [30, "30 jours"], [60, "60 jours"], [90, "90 jours"]]} onChange={(v) => setW({ goodConduct: { ...w.goodConduct, periodDays: v } })} />
          </div>
        </Row>
      </Panel>

      <Panel title={tx("Réponses et messages privés")}>
        {toggle("MP au membre", r.dmMember, (v) => setR({ dmMember: v }), "Le membre reçoit sa sanction en message privé, avec le numéro du dossier et le bouton d'appel s'il est ouvert.")}
        {toggle("Nommer le modérateur", r.nameModerator, (v) => setR({ nameModerator: v }), "Sinon, le membre lit « L'équipe de modération ».")}
        {toggle("Masquer les réponses", r.hideReplies, (v) => setR({ hideReplies: v }), "La réponse des commandes de sanction n'est visible que du modérateur (commandes slash).")}
        {toggle("Bouton Annuler", r.undoButton, (v) => setR({ undoButton: v }), "Avertissement, mute et ban : 10 secondes pour annuler, pour le modérateur seulement.")}
        {toggle("Raison obligatoire pour avertir", r.requireReason, (v) => setR({ requireReason: v }))}
        {toggle("Sanctions publiques par défaut", r.publicByDefault, (v) => setR({ publicByDefault: v }), "Avec les réponses masquées, un bouton Afficher montre la sanction à tout le salon (sans contexte ni preuves).")}
        {toggle("Rappel de fin", r.endReminder, (v) => setR({ endReminder: v }), "Le membre est prévenu en MP quand son mute ou son ban temporaire se termine.")}
      </Panel>

      <Panel title={tx("Historique des membres")}>
        {toggle("Sanctions de la protection", h.protection, (v) => setH({ protection: v }), "Bans, expulsions, timeouts et infractions des modules de messages. Regroupées par 10 minutes pendant un raid.")}
        {toggle("Infractions AutoMod", h.automod, (v) => setH({ automod: v }))}
        {toggle("Sanctions faites dans Discord", h.discord, (v) => setH({ discord: v }), "Bannir, expulser ou exclure à la main dans Discord crée aussi un dossier, au nom du modérateur.")}
        {toggle("Arrivées, départs et pseudos", h.joins, (v) => setH({ joins: v }), "Gardés 90 jours, chiffrés, affichés dans l'historique du membre.")}
      </Panel>

      <Panel title={tx("Garde-fou")} actions={<Switch checked={g.enabled} onChange={(v) => setG({ enabled: v })} label={tx("Garde-fou")} />}>
        <Row label={tx("Sanctions par heure")} hint={tx("Au-delà, les owners sont prévenus : un modérateur qui sanctionne en rafale, c'est souvent un compte volé ou un abus.")}>
          <Stepper value={g.perHour} min={1} max={500} onCommit={(n) => setG({ perHour: n })} />
        </Row>
        <Row label={tx("Salon d'alerte")} hint={tx("Sans salon, le propriétaire du serveur est prévenu en MP.")}>
          <ChannelPicker guildId={guildId} value={g.alertChannelId ?? ""} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => setG({ alertChannelId: id || null })} />
        </Row>
      </Panel>

      <Panel title={tx("Journal des sanctions")} subtitle={tx("Chaque nouveau dossier y est publié pour l'équipe.")}>
        <Row label={tx("Salon du journal")}>
          <ChannelPicker
            guildId={guildId}
            value={modLog ?? ""}
            filterTypes={[0, 5]}
            placeholder={tx("Choisir un salon")}
            onChange={async (id) => {
              const res = await api<{ modLogChannelId: string | null }>("/moderation/mod-log-channel", { method: "PUT", json: { channelId: id || null } });
              if (res) setModLog(res.modLogChannelId);
            }}
          />
        </Row>
      </Panel>
    </ConsolePage>
  );
}
