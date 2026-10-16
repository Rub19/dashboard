"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "@/components/icons/ph";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import LevelingBoostsPanel, { type Boost } from "@/app/discord/leveling/LevelingBoostsPanel";
import {
  EmbedPreview,
  FONTS,
  HEX,
  LEVELUP_TYPES,
  RANK_CARD_DEFAULTS,
  REWARD_TYPES,
  REWARD_VARS,
  RankCardPreview,
  SHAPES,
  VARS,
  fill,
  type LevelingSettings,
  type RankCardStyle,
} from "@/app/discord/leveling/LevelingSettingsPanel";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ChannelAdder, Chip, ConsolePage, EmptyLine, GhostButton, Panel, RoleAdder, RoleChips, Row, Segmented, Select, StatTile, Stepper, Switch, TextField, roleColor, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type Overview = { activeMembersCount: number; totalXpDistributed: number; totalLevels: number; topUser?: { username: string; level: number } | null };
type Member = { userId: string; username: string; avatarUrl: string | null; totalXp: number; level: number; rank: number; progressPercentage: number };
type Reward = { id: string; level: number; roleId: string; message: string | null };

const fmt = (n: number) => n.toLocaleString("fr-FR");


/** Niveaux (format Keeper) : annonces, gain d'XP, vocal, exclusions, récompenses, boosts, carte /rank et classement. */
export default function ConsoleLeveling({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<LevelingSettings | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [newLevel, setNewLevel] = useState(10);
  const [xpStep, setXpStep] = useState(100);

  const load = useCallback(async () => {
    const [c, o, l, r, b] = await Promise.all([
      api<{ config: LevelingSettings }>("/leveling/config"),
      api<Overview>("/leveling/overview", { silent: true }),
      api<{ leaderboard: Member[] }>("/leveling/leaderboard?limit=10", { silent: true }),
      api<{ rewards: Reward[] }>("/leveling/rewards", { silent: true }),
      api<{ boosts: Boost[] }>("/leveling/boosts", { silent: true }),
    ]);
    if (c) setCfg({ ...c.config, rankCard: { ...RANK_CARD_DEFAULTS, ...(c.config.rankCard ?? {}) } });
    if (o) setOv(o);
    setMembers(l?.leaderboard ?? []);
    setRewards((r?.rewards ?? []).sort((a, z) => a.level - z.level));
    setBoosts(b?.boosts ?? []);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const save = async (patch: Partial<LevelingSettings>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: LevelingSettings }>("/leveling/config", { method: "PATCH", json: patch });
    if (r) setCfg({ ...r.config, rankCard: { ...RANK_CARD_DEFAULTS, ...(r.config.rankCard ?? {}) } });
    else void load();
  };
  const saveCard = (patch: Partial<RankCardStyle>) => cfg && save({ rankCard: { ...cfg.rankCard, ...patch } });

  const addReward = async (roleId: string) => {
    const r = await api<{ reward: Reward }>("/leveling/rewards", { method: "POST", json: { level: newLevel, roleId, message: "" } });
    if (r) setRewards((list) => [...list, r.reward].sort((a, z) => a.level - z.level));
  };
  const removeReward = async (id: string) => {
    if (await api(`/leveling/rewards/${id}`, { method: "DELETE" })) setRewards((list) => list.filter((x) => x.id !== id));
  };
  const adjust = async (m: Member, delta: number) => {
    const r = await api<{ user: Partial<Member> }>(`/leveling/users/${m.userId}/adjust`, { method: "POST", json: { delta } });
    if (r) setMembers((list) => list?.map((x) => (x.userId === m.userId ? { ...x, ...r.user } : x)).sort((a, z) => z.totalXp - a.totalXp) ?? null);
  };

  if (!cfg) {
    return (
      <ConsolePage title={tx("Niveaux")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/leaderboard?guildId=${guildId}` : "";

  return (
    <ConsolePage title={tx("Niveaux")}>
      {!cfg.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : personne ne gagne d'XP. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Membres classés")} value={ov ? fmt(ov.activeMembersCount) : "—"} />
        <StatTile label={tx("XP distribuée")} value={ov ? fmt(ov.totalXpDistributed) : "—"} />
        <StatTile label={tx("Meilleur niveau")} value={ov?.topUser ? `Niv. ${ov.topUser.level}` : "—"} hint={ov?.topUser?.username} />
        <StatTile label={tx("Récompenses")} value={rewards.length} hint={tx("rôle{v0} à débloquer", { v0: rewards.length > 1 ? "s" : "" })} />
      </motion.div>

      <Panel title={tx("Annonce d'un nouveau niveau")}>
        <Row label={tx("Où annoncer")}>
          <Select value={cfg.levelUpChannelType} options={LEVELUP_TYPES} onChange={(v) => save({ levelUpChannelType: v })} aria-label={tx("Où annoncer")} />
        </Row>
        {cfg.levelUpChannelType === "specific_channel" && (
          <Row label={tx("Salon")}>
            <ChannelPicker guildId={guildId} value={cfg.levelUpChannelId} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => save({ levelUpChannelId: id || null })} />
          </Row>
        )}
        {cfg.levelUpChannelType !== "disabled" && (
          <Row label={tx("Message")} hint={tx("Variables : cliquer pour insérer.")}>
            <MessageEditor value={cfg.levelUpMessage} vars={VARS} onCommit={(v) => save({ levelUpMessage: v })} preview={(v) => <EmbedPreview color={cfg.accentColor} title={tx("Niveau supérieur !")} text={fill(v)} />} />
          </Row>
        )}
      </Panel>

      <Panel title={tx("Gain d'XP")}>
        <Row label={tx("XP par message")} hint={tx("Un nombre au hasard entre les deux.")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">{tx("de")}</span>
            <Stepper value={cfg.minXp} min={1} max={Math.min(100, cfg.maxXp)} onCommit={(n) => save({ minXp: n })} />
            <span className="text-xs text-[var(--text-muted)]">à</span>
            <Stepper value={cfg.maxXp} min={Math.max(5, cfg.minXp)} max={200} unit="XP" onCommit={(n) => save({ maxXp: n })} />
          </div>
        </Row>
        <Row label={tx("Délai entre deux gains")}>
          <Stepper value={cfg.cooldownSeconds} min={5} max={300} step={5} unit="s" onCommit={(n) => save({ cooldownSeconds: n })} />
        </Row>
        <Row label={tx("Longueur minimale")} hint={tx("Les messages plus courts ne rapportent rien.")}>
          <Stepper value={cfg.minMessageLength} min={0} max={50} unit={tx("caractères")} onCommit={(n) => save({ minMessageLength: n })} />
        </Row>
        <Row label={tx("Niveau maximum")} hint={tx("0 = aucun plafond.")}>
          <Stepper value={cfg.maxLevel} min={0} max={1000} onCommit={(n) => save({ maxLevel: n })} />
        </Row>
        <Row label={tx("XP en vocal")} hint={tx("De l'XP à chaque minute passée en vocal.")}>
          <Switch checked={cfg.voiceXpEnabled} onChange={(v) => save({ voiceXpEnabled: v })} label={tx("XP en vocal")} />
        </Row>
        <Collapse open={cfg.voiceXpEnabled}>
          <Row label={tx("XP par minute")}>
            <Stepper value={cfg.voiceXpPerMinute} min={1} max={50} unit="XP" onCommit={(n) => save({ voiceXpPerMinute: n })} />
          </Row>
          <Row label={tx("Membres minimum dans le salon")} hint={tx("2 évite de gagner de l'XP tout seul.")}>
            <Stepper value={cfg.voiceXpMinMembers} min={1} max={10} onCommit={(n) => save({ voiceXpMinMembers: n })} />
          </Row>
          <Row label={tx("Pas d'XP muet ou en sourdine")}>
            <Switch checked={cfg.voiceXpIgnoreMuted} onChange={(v) => save({ voiceXpIgnoreMuted: v })} label={tx("Pas d'XP muet ou en sourdine")} />
          </Row>
        </Collapse>
      </Panel>

      <Panel title={tx("Où l'XP compte")}>
        <Row label={tx("Salons ignorés")} hint={tx("Une catégorie exclut tous ses salons.")}>
          <div className="flex flex-wrap items-center gap-1.5">
            {cfg.excludedChannelIds.map((id) => (
              <Chip key={id} label={`#${channelName(id)}`} onRemove={() => save({ excludedChannelIds: cfg.excludedChannelIds.filter((x) => x !== id) })} />
            ))}
            <ChannelAdder guildId={guildId} label={tx("Salon")} excludeIds={cfg.excludedChannelIds} onPick={(c) => save({ excludedChannelIds: [...cfg.excludedChannelIds, c.id] })} />
          </div>
        </Row>
        <Row label={tx("Rôles ignorés")}>
          <RoleChips guildId={guildId} ids={cfg.excludedRoleIds} onChange={(ids) => save({ excludedRoleIds: ids })} />
        </Row>
        <Row label={tx("Fils de discussion")}>
          <Switch checked={cfg.xpInThreads} onChange={(v) => save({ xpInThreads: v })} label={tx("XP dans les fils")} />
        </Row>
        <Row label={tx("Forums")}>
          <Switch checked={cfg.xpInForums} onChange={(v) => save({ xpInForums: v })} label={tx("XP dans les forums")} />
        </Row>
        <Row label={tx("Bots")}>
          <Switch checked={cfg.allowBots} onChange={(v) => save({ allowBots: v })} label={tx("XP des bots")} />
        </Row>
        <Row label={tx("Garder l'XP au départ")} hint={tx("Un membre qui revient retrouve son niveau.")}>
          <Switch checked={cfg.keepXpOnLeave} onChange={(v) => save({ keepXpOnLeave: v })} label={tx("Garder l'XP au départ")} />
        </Row>
      </Panel>

      <Panel
        title={tx("Récompenses")}
        subtitle={tx("Un rôle donné en atteignant un niveau.")}
        actions={
          <div className="flex items-center gap-2">
            <Stepper value={newLevel} min={1} max={1000} unit="niv." onCommit={setNewLevel} />
            <RoleAdder guildId={guildId} label={tx("Rôle")} excludeIds={rewards.map((r) => r.roleId)} onPick={(r) => addReward(r.id)} />
          </div>
        }
      >
        {rewards.length === 0 ? (
          <EmptyLine>{tx("Aucune récompense. Choisis un niveau puis un rôle.")}</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {rewards.map((r) => (
                <motion.li key={r.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                  <span className="w-16 shrink-0 font-mono text-xs text-[var(--text-muted)]">{tx("Niv.")}{" "} {r.level}</span>
                  <RewardRole guildId={guildId} roleId={r.roleId} />
                  <button type="button" onClick={() => removeReward(r.id)} aria-label={tx("Supprimer la récompense")} className="ml-auto rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        <Row label={tx("Attribution")}>
          <Segmented
            label={tx("Attribution")}
            value={cfg.rewardType}
            options={[
              ["cumulative", "Garder tous les rôles"],
              ["progressive", "Seulement le plus haut"],
            ]}
            onChange={(v) => save({ rewardType: v })}
          />
        </Row>
        <Row label={tx("Annonce")}>
          <Select value={cfg.rewardAnnounceType} options={REWARD_TYPES} onChange={(v) => save({ rewardAnnounceType: v })} aria-label={tx("Annonce d'une récompense")} />
        </Row>
        {cfg.rewardAnnounceType === "specific_channel" && (
          <Row label={tx("Salon des récompenses")}>
            <ChannelPicker guildId={guildId} value={cfg.rewardChannelId} filterTypes={[0, 5]} placeholder={tx("Choisir un salon")} onChange={(id) => save({ rewardChannelId: id || null })} />
          </Row>
        )}
        {["same_channel", "specific_channel", "dm"].includes(cfg.rewardAnnounceType) && (
          <Row label={tx("Message de récompense")}>
            <MessageEditor value={cfg.rewardMessage} vars={REWARD_VARS} onCommit={(v) => save({ rewardMessage: v })} preview={(v) => <EmbedPreview color={cfg.accentColor} text={fill(v)} />} />
          </Row>
        )}
      </Panel>

      <Panel title={tx("Boosts d'XP")} subtitle={tx("Multiplicateurs (bonus ou malus) par rôle, salon, membre ou période.")}>
        <div className="console-embed px-5 py-4">
          <LevelingBoostsPanel guildId={guildId} boosts={boosts} disabled={false} onChanged={load} />
        </div>
      </Panel>

      <Panel title={tx("Carte /rank")} subtitle={tx("Aussi réglable sur Discord avec /xp carte.")} actions={<GhostButton onClick={() => save({ rankCard: RANK_CARD_DEFAULTS })}>{tx("Par défaut")}</GhostButton>}>
        <Row label={tx("Couleur du système")}>
          <ColorInput value={cfg.accentColor} onCommit={(v) => save({ accentColor: v })} />
        </Row>
        <Row label={tx("Fond")}>
          <ColorInput value={cfg.rankCard.backgroundColor} onCommit={(v) => saveCard({ backgroundColor: v })} />
        </Row>
        <Row label={tx("Texte")}>
          <ColorInput value={cfg.rankCard.textColor} onCommit={(v) => saveCard({ textColor: v })} />
        </Row>
        <Row label={tx("Police")}>
          <Select value={cfg.rankCard.font} options={FONTS} onChange={(v) => saveCard({ font: v })} aria-label={tx("Police")} />
        </Row>
        <Row label={tx("Avatar")}>
          <Segmented label={tx("Forme de l'avatar")} value={cfg.rankCard.avatarShape} options={SHAPES} onChange={(v) => saveCard({ avatarShape: v })} />
        </Row>
        <Row label={tx("Image de fond")} hint={tx("Lien https, vide pour un fond uni.")}>
          <TextField value={cfg.rankCard.backgroundUrl ?? ""} maxLength={500} placeholder="https://…" width="w-full max-w-sm" onCommit={(v) => /^https:\/\/\S+$/i.test(v) && saveCard({ backgroundUrl: v })} />
        </Row>
        {cfg.rankCard.backgroundUrl && (
          <Row label={tx("Voile sur l'image")}>
            <div className="flex items-center gap-2">
              <Stepper value={cfg.rankCard.overlayOpacity} min={0} max={90} step={5} unit="%" onCommit={(n) => saveCard({ overlayOpacity: n })} />
              <GhostButton onClick={() => saveCard({ backgroundUrl: null })}>{tx("Retirer l'image")}</GhostButton>
            </div>
          </Row>
        )}
        <div className="border-t border-[var(--panel-border)] px-5 py-4">
          <RankCardPreview url={`${BOT_API_URL}/api/guilds/${guildId}/leveling/rank-card/preview`} accentColor={cfg.accentColor} rankCard={cfg.rankCard} />
        </div>
      </Panel>

      <Panel title={tx("Classements")}>
        <Row label={tx("Sur Discord")} hint={tx("Commande /leaderboard.")}>
          <Switch checked={cfg.leaderboardOnDiscord} onChange={(v) => save({ leaderboardOnDiscord: v })} label={tx("Classement sur Discord")} />
        </Row>
        <Row label={tx("Page publique")} hint={tx("Pseudo, avatar, niveau et XP seulement.")}>
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={cfg.leaderboardPublic} onChange={(v) => save({ leaderboardPublic: v })} label={tx("Classement en ligne")} />
            {cfg.leaderboardPublic && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-[var(--accent-primary)] hover:underline">
                {tx("Ouvrir la page")}
              </a>
            )}
          </div>
        </Row>
      </Panel>

      <Panel
        title={tx("Top 10")}
        subtitle={tx("Ajuste l'XP d'un membre à la main.")}
        actions={<Stepper value={xpStep} min={1} max={100000} step={50} unit="XP" onCommit={setXpStep} />}
      >
        {!members ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : members.length === 0 ? (
          <EmptyLine>{tx("Personne n'a encore d'XP.")}</EmptyLine>
        ) : (
          <ol>
            {members.map((m, i) => (
              <li key={m.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{i + 1}</span>
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-hover)]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[var(--text-primary)]">{m.username}</span>
                  <span className="mt-1 block h-1 w-full max-w-40 overflow-hidden rounded-full bg-[var(--panel-border)]">
                    <span className="block h-full rounded-full bg-[var(--success)]" style={{ width: `${Math.min(100, m.progressPercentage)}%` }} />
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span className="block font-semibold text-[var(--text-primary)]">{tx("Niv.")}{" "} {m.level}</span>
                  <span className="block font-mono text-[11px] text-[var(--text-muted)]">{fmt(m.totalXp)} {" "}{tx("XP")}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => adjust(m, -xpStep)} aria-label={tx("Retirer {xpStep} XP à {username}", { xpStep, username: m.username })} className="rounded-md border border-[var(--panel-border)] p-1 text-[var(--text-muted)] hover:text-[var(--danger)]">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => adjust(m, xpStep)} aria-label={tx("Ajouter {xpStep} XP à {username}", { xpStep, username: m.username })} className="rounded-md border border-[var(--panel-border)] p-1 text-[var(--text-muted)] hover:text-[var(--success)]">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </ConsolePage>
  );
}

/** Nom et couleur d'un rôle de récompense (cache des rôles partagé). */
function RewardRole({ guildId, roleId }: { guildId: string; roleId: string }) {
  const [role, setRole] = useState<{ name: string; color?: string | number } | null>(null);
  useEffect(() => {
    import("../../RolePicker").then(({ fetchGuildRoles }) => fetchGuildRoles(guildId)).then((roles) => setRole(roles.find((r) => r.id === roleId) ?? null));
  }, [guildId, roleId]);
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--text-primary)]">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: roleColor(role?.color) }} />
      <span className="truncate">{role ? `@${role.name}` : tx("Rôle introuvable")}</span>
    </span>
  );
}

/** Message avec variables à insérer et aperçu Discord ; enregistré à la sortie du champ. */
function MessageEditor({ value, vars, onCommit, preview }: { value: string; vars: string[]; onCommit: (v: string) => void; preview: (v: string) => ReactNode }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (v: string) => v.trim() && v !== value && onCommit(v);
  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        maxLength={500}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
      />
      <div className="flex flex-wrap gap-1">
        {vars.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              const next = `${draft}${v}`.slice(0, 500);
              setDraft(next);
              commit(next);
            }}
            className="rounded border border-[var(--panel-border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {v}
          </button>
        ))}
      </div>
      {preview(draft)}
    </div>
  );
}

function ColorInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = HEX.test(draft);
  return (
    <span className="flex items-center gap-2">
      <input type="color" value={valid ? draft : "#000000"} onChange={(e) => setDraft(e.target.value)} onBlur={() => valid && draft !== value && onCommit(draft)} aria-label={tx("Couleur")} className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent" />
      <input
        value={draft}
        maxLength={7}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => HEX.test(draft) && draft !== value && onCommit(draft)}
        aria-label={tx("Code couleur")}
        className={cn("h-9 w-24 rounded-lg border bg-[var(--surface-base,var(--bg-main))] px-2.5 font-mono text-xs text-[var(--text-primary)] outline-none", valid ? "border-[var(--panel-border)]" : "border-[var(--danger)]/60")}
      />
    </span>
  );
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
