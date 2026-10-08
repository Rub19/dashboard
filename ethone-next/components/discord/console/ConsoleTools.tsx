"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../ChannelPicker";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, Panel, RoleChips, Row, Segmented, Switch, useGuildApi } from "./kit";

type Captcha = {
  enabled: boolean;
  channelId: string | null;
  givenRoles: string[];
  removedRoles: string[];
  attempts: number;
  delayMinutes: number;
  failAction: "kick" | "ban" | "none";
  mentionOnJoin: boolean;
  logChannelId: string | null;
  logSuccess: boolean;
};
type Tools = { captcha: Captcha; captchaPending: number; supporters: { enabled: boolean; roleId: string | null }; supportersCount: number };

const FAIL_ACTIONS = [
  { id: "kick", label: "Expulsion", hint: "Il peut revenir" },
  { id: "ban", label: "Bannissement", hint: "Définitif" },
  { id: "none", label: "Rien", hint: "Reste sans accès" },
] as const;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Outils (format Keeper) : captcha à l'arrivée et rôle des soutiens (membres qui portent le tag du serveur). */
export default function ConsoleTools({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [tools, setTools] = useState<Tools | null>(null);

  const load = useCallback(async () => {
    const d = await api<Tools>("/console/tools");
    if (d) setTools(d);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const saveCaptcha = async (patch: Partial<Captcha>) => {
    setTools((t) => (t ? { ...t, captcha: { ...t.captcha, ...patch } } : t));
    const d = await api<Tools>("/console/tools/captcha", { method: "PATCH", json: patch });
    if (d) setTools(d);
    else void load();
  };
  const saveSupporters = async (patch: Partial<Tools["supporters"]>) => {
    setTools((t) => (t ? { ...t, supporters: { ...t.supporters, ...patch } } : t));
    const d = await api<Tools>("/console/tools/supporters", { method: "PATCH", json: patch });
    if (d) setTools(d);
    else void load();
  };

  if (!tools) {
    return (
      <ConsolePage title="Outils">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const c = tools.captcha;
  const s = tools.supporters;

  return (
    <ConsolePage title="Outils">
      <Panel
        title="Captcha à l'arrivée"
        subtitle={`${plural(tools.captchaPending, "membre", "membres")} en cours de vérification.`}
        actions={
          <Switch
            checked={c.enabled}
            onChange={(v) => saveCaptcha({ enabled: v })}
            disabled={!c.enabled && !c.channelId}
            label={c.enabled ? "Désactiver le captcha" : "Activer le captcha"}
          />
        }
      >
        <Row label="Salon de vérification" hint="Etho y poste le bouton « Commencer la vérification ». Les nouveaux membres doivent pouvoir le voir.">
          <ChannelPicker guildId={guildId} value={c.channelId} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => id && saveCaptcha({ channelId: id })} />
        </Row>
        {!c.channelId && <p className="border-t border-[var(--panel-border)] px-5 py-2.5 text-[11px] text-[var(--warning)]">Choisis un salon de vérification pour pouvoir activer le captcha.</p>}
        <Row label="Rôles donnés" hint="Après la réussite (ex. le rôle qui ouvre les salons).">
          <RoleChips guildId={guildId} ids={c.givenRoles} onChange={(ids) => saveCaptcha({ givenRoles: ids })} />
        </Row>
        <Row label="Rôles retirés" hint="Après la réussite (ex. un rôle « Non vérifié »).">
          <RoleChips guildId={guildId} ids={c.removedRoles} onChange={(ids) => saveCaptcha({ removedRoles: ids })} />
        </Row>
        <Row label="Tentatives">
          <Segmented label="Tentatives" value={c.attempts} options={[1, 2, 3, 4, 5].map((n) => [n, String(n)] as const)} onChange={(v) => saveCaptcha({ attempts: v })} />
        </Row>
        <Row label="Délai" hint="En minutes, pour réussir le captcha.">
          <Segmented label="Délai" value={c.delayMinutes} options={[2, 5, 10, 15, 30, 60].map((n) => [n, String(n)] as const)} onChange={(v) => saveCaptcha({ delayMinutes: v })} />
        </Row>
        <Row label="En cas d'échec">
          <div role="radiogroup" aria-label="En cas d'échec" className="grid gap-2 sm:grid-cols-3">
            {FAIL_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={c.failAction === a.id}
                onClick={() => c.failAction !== a.id && saveCaptcha({ failAction: a.id })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  c.failAction === a.id
                    ? "border-[var(--success)]/60 bg-[var(--success)]/10"
                    : "border-[var(--panel-border)] hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className={cn("block text-xs font-semibold", c.failAction === a.id ? "text-[var(--success)]" : "text-[var(--text-primary)]")}>{a.label}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">{a.hint}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label="Mention à l'arrivée" hint="Mentionne le nouveau membre dans le salon de vérification (message supprimé ensuite).">
          <Switch checked={c.mentionOnJoin} onChange={(v) => saveCaptcha({ mentionOnJoin: v })} label="Mention à l'arrivée" />
        </Row>
        <Row label="Salon des logs" hint="Échecs et sanctions y sont notés.">
          <ChannelPicker
            guildId={guildId}
            value={c.logChannelId}
            filterTypes={[0, 5]}
            placeholder="Choisir un salon"
            emptyLabel="Pas de salon"
            onChange={(id) => saveCaptcha({ logChannelId: id || null })}
          />
        </Row>
        <AnimatePresence initial={false}>
          {c.logChannelId && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT}>
              <Row label="Noter les réussites">
                <Switch checked={c.logSuccess} onChange={(v) => saveCaptcha({ logSuccess: v })} label="Noter les réussites" />
              </Row>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <Panel
        title="Soutiens"
        subtitle={`${plural(tools.supportersCount, "soutien", "soutiens")} en ce moment.`}
        actions={<Switch checked={s.enabled} onChange={(v) => saveSupporters({ enabled: v })} disabled={!s.enabled && !s.roleId} label={s.enabled ? "Désactiver les soutiens" : "Activer les soutiens"} />}
      >
        <Row label="Comment reconnaître un soutien">
          <p className="text-xs text-[var(--text-primary)]">
            Il affiche le <span className="font-semibold">tag du serveur</span> sur son profil Discord.
          </p>
        </Row>
        <Row label="Rôle donné" hint="Retiré automatiquement s'il enlève le tag. Le rôle doit être sous celui d'Etho.">
          <RoleChips guildId={guildId} ids={s.roleId ? [s.roleId] : []} max={1} onChange={(ids) => saveSupporters({ roleId: ids[0] ?? null, ...(ids.length ? {} : { enabled: false }) })} />
        </Row>
      </Panel>
    </ConsolePage>
  );
}
