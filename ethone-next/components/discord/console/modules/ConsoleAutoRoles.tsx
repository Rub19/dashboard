"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Folder, Hash, ShieldCheck, Volume2 } from "lucide-react";
import { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Chip, ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Select, Switch, useGuildApi } from "../kit";

type Temp = { enabled: boolean; roleIds: string[]; durationMinutes: number; waitForScreening: boolean };
type Voice = { enabled: boolean; roleIds: string[]; memberMode: "allow" | "deny"; memberRoleIds: string[]; channelMode: "allow" | "deny"; channelIds: string[]; ignoreBots: boolean };
type AutoRole = {
  enabled: boolean;
  roleIds: string[];
  applyToHumans: boolean;
  applyToBots: boolean;
  useSeparateBotRoles: boolean;
  botRoleIds: string[];
  waitForScreening: boolean;
  temp: Temp;
  voice: Voice;
};

const DURATIONS: ReadonlyArray<readonly [number, string]> = [
  [10, "10 minutes"],
  [30, "30 minutes"],
  [60, "1 heure"],
  [180, "3 heures"],
  [360, "6 heures"],
  [720, "12 heures"],
  [1440, "1 jour"],
  [4320, "3 jours"],
  [10080, "7 jours"],
  [20160, "14 jours"],
  [43200, "30 jours"],
];

function Section({ title, on, onToggle, children }: { title: string; on: boolean; onToggle: (v: boolean) => void; children: ReactNode }) {
  return (
    <Panel title={title} actions={<Switch checked={on} onChange={onToggle} label={title} />}>
      {children}
    </Panel>
  );
}

/** Salons et catégories en pastilles + recherche, pour les rôles en vocal. */
function ChannelChips({ guildId, ids, onChange }: { guildId: string; ids: string[]; onChange: (ids: string[]) => void }) {
  const [all, setAll] = useState<ChannelOption[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetchGuildChannels(guildId).then((c) => setAll(c.filter((x) => x.type === 2 || x.type === 13 || x.type === 4)));
  }, [guildId]);
  const find = (id: string) => all.find((c) => c.id === id);
  const icon = (t?: number) => (t === 4 ? <Folder className="h-3 w-3 text-[var(--text-muted)]" /> : t === 2 || t === 13 ? <Volume2 className="h-3 w-3 text-[var(--text-muted)]" /> : <Hash className="h-3 w-3 text-[var(--text-muted)]" />);
  const shown = all.filter((c) => !ids.includes(c.id) && (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {ids.map((id) => (
          <motion.span key={id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING_PILL}>
            <Chip label={find(id)?.name ?? id} onRemove={() => onChange(ids.filter((x) => x !== id))}>
              {icon(find(id)?.type)}
            </Chip>
          </motion.span>
        ))}
      </AnimatePresence>
      <div className="relative">
        <GhostButton onClick={() => setOpen((v) => !v)} expanded={open}>+ Ajouter un salon ou une catégorie</GhostButton>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={SPRING_PILL}
              className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl"
            >
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} placeholder="Rechercher un salon vocal ou une catégorie" className="w-full border-b border-[var(--panel-border)] bg-transparent px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] outline-none" />
              <ul className="max-h-64 overflow-y-auto p-1.5">
                {shown.length === 0 ? (
                  <li className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">Aucun résultat.</li>
                ) : (
                  shown.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange([...ids, c.id]);
                          setOpen(false);
                          setQ("");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                      >
                        {icon(c.type)}
                        <span className={cn("truncate", c.type === 4 && "font-semibold uppercase tracking-wide text-[11px]")}>{c.name}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Rôles automatiques (format Keeper) : rôles à l'arrivée, rôle temporaire et rôles en vocal. Tout est gratuit. */
export default function ConsoleAutoRoles({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<AutoRole | null>(null);

  useEffect(() => {
    api<{ config: AutoRole }>("/roles/autorole").then((r) => r && setCfg(r.config));
  }, [api]);

  const save = async (patch: Partial<AutoRole>) => {
    if (!cfg) return;
    const prev = cfg;
    setCfg({ ...cfg, ...patch });
    const r = await api<{ config: AutoRole }>("/roles/autorole", { method: "PATCH", json: patch });
    setCfg(r ? r.config : prev);
  };

  if (!cfg)
    return (
      <ConsolePage title="Rôles automatiques">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );

  const botIds = cfg.applyToBots ? (cfg.useSeparateBotRoles ? cfg.botRoleIds : cfg.roleIds) : [];
  const temp = cfg.temp;
  const voice = cfg.voice;
  const setTemp = (p: Partial<Temp>) => save({ temp: { ...temp, ...p } });
  const setVoice = (p: Partial<Voice>) => save({ voice: { ...voice, ...p } });

  return (
    <ConsolePage
      title={
        <span className="block">
          Rôles automatiques
          <span className="mt-1 block text-sm font-normal tracking-normal text-[var(--text-muted)]">Rôles donnés à l&apos;arrivée, pour un temps limité ou pendant une présence en vocal.</span>
        </span>
      }
    >
      <Section title="Rôles à l'arrivée" on={cfg.enabled} onToggle={(v) => save({ enabled: v })}>
        <Row label="Nouveaux membres" hint="Donnés à chaque membre qui rejoint le serveur.">
          <RoleChips guildId={guildId} ids={cfg.roleIds} addLabel="Ajouter un rôle" onChange={(ids) => save({ roleIds: ids, applyToHumans: true })} />
        </Row>
        <Row label="Bots ajoutés" hint="Donnés aux bots invités sur le serveur.">
          <RoleChips guildId={guildId} ids={botIds} addLabel="Ajouter un rôle" onChange={(ids) => save({ botRoleIds: ids, useSeparateBotRoles: true, applyToBots: ids.length > 0 })} />
        </Row>
        <Row label="Attendre la vérification" hint="Les rôles arrivent quand le membre a accepté les règles du serveur.">
          <Switch checked={cfg.waitForScreening} onChange={(v) => save({ waitForScreening: v })} label="Attendre la vérification" />
        </Row>
      </Section>

      <Section title="Rôle temporaire à l'arrivée" on={temp.enabled} onToggle={(v) => setTemp({ enabled: v })}>
        <Row label="Rôles" hint="Par exemple un rôle « Nouveau » qui ouvre un salon d'accueil.">
          <RoleChips guildId={guildId} ids={temp.roleIds} addLabel="Ajouter un rôle" onChange={(ids) => setTemp({ roleIds: ids })} />
        </Row>
        <Row label="Retiré après" hint="Le rôle est retiré automatiquement, même si Etho redémarre entre-temps.">
          <Select value={temp.durationMinutes} options={DURATIONS} onChange={(v) => setTemp({ durationMinutes: v })} aria-label="Durée du rôle temporaire" />
        </Row>
        <Row label="Attendre la vérification">
          <Switch checked={temp.waitForScreening} onChange={(v) => setTemp({ waitForScreening: v })} label="Attendre la vérification" />
        </Row>
      </Section>

      <Section title="Rôles en vocal" on={voice.enabled} onToggle={(v) => setVoice({ enabled: v })}>
        <Row label="Rôles donnés" hint="Donnés en entrant dans un salon vocal concerné, retirés en le quittant.">
          <RoleChips guildId={guildId} ids={voice.roleIds} addLabel="Ajouter un rôle" onChange={(ids) => setVoice({ roleIds: ids })} />
        </Row>
        <Row label="Membres concernés" hint={voice.memberRoleIds.length ? (voice.memberMode === "allow" ? "Seuls les membres avec un de ces rôles." : "Tout le monde sauf les membres avec un de ces rôles.") : "Vide : tous les membres."}>
          <div className="space-y-2">
            <Segmented
              label="Membres concernés"
              value={voice.memberMode}
              options={[
                ["allow", "Rôles autorisés"],
                ["deny", "Rôles interdits"],
              ]}
              onChange={(v) => setVoice({ memberMode: v })}
            />
            <RoleChips guildId={guildId} ids={voice.memberRoleIds} addLabel="Ajouter un rôle" onChange={(ids) => setVoice({ memberRoleIds: ids })} />
          </div>
        </Row>
        <Row label="Salons concernés" hint={voice.channelIds.length ? (voice.channelMode === "allow" ? "Seulement ces salons (une catégorie inclut ses salons)." : "Tous les salons sauf ceux-ci.") : "Vide : tous les salons vocaux."}>
          <div className="space-y-2">
            <Segmented
              label="Salons concernés"
              value={voice.channelMode}
              options={[
                ["allow", "Salons autorisés"],
                ["deny", "Salons interdits"],
              ]}
              onChange={(v) => setVoice({ channelMode: v })}
            />
            <ChannelChips guildId={guildId} ids={voice.channelIds} onChange={(ids) => setVoice({ channelIds: ids })} />
          </div>
        </Row>
        <Row label="Ignorer les bots">
          <Switch checked={voice.ignoreBots} onChange={(v) => setVoice({ ignoreBots: v })} label="Ignorer les bots" />
        </Row>
      </Section>

      <Panel>
        <p className="flex items-start gap-2.5 px-5 py-4 text-xs leading-relaxed text-[var(--text-muted)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
          Etho ne donne jamais un rôle avec une permission dangereuse, ni un rôle placé au-dessus du sien. Rien n&apos;est donné à un compte que la protection retire.
        </p>
      </Panel>
    </ConsolePage>
  );
}
