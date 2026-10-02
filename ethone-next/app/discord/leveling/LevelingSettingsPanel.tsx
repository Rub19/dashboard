"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "@/components/icons/ph";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { MultiChannelPicker, MultiRolePicker } from "@/components/discord/MultiPickers";
import { Field, NumberField, Section, Switch, ToggleField, inputCls } from "@/components/discord/SettingsUI";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

export interface LevelingSettings {
  enabled: boolean;
  minXp: number;
  maxXp: number;
  cooldownSeconds: number;
  minMessageLength: number;
  levelUpChannelType: "same_channel" | "specific_channel" | "dm" | "disabled";
  levelUpChannelId: string | null;
  levelUpMessage: string;
  rewardType: "cumulative" | "progressive";
  excludedChannelIds: string[];
  excludedRoleIds: string[];
  allowBots: boolean;
  maxLevel: number;
  xpInThreads: boolean;
  xpInForums: boolean;
  keepXpOnLeave: boolean;
  voiceXpEnabled: boolean;
  voiceXpPerMinute: number;
  voiceXpIgnoreMuted: boolean;
  voiceXpMinMembers: number;
  leaderboardPublic: boolean;
  leaderboardOnDiscord: boolean;
  accentColor: string;
  rankCard: RankCardStyle;
  rewardAnnounceType: "with_levelup" | "same_channel" | "specific_channel" | "dm" | "disabled";
  rewardChannelId: string | null;
  rewardMessage: string;
}

export interface RankCardStyle {
  backgroundColor: string;
  textColor: string;
  backgroundUrl: string | null;
  overlayOpacity: number;
  avatarShape: "circle" | "rounded" | "square";
  font: "poppins" | "bebas" | "serif" | "mono";
}

// Mêmes défauts que RankCardStyleSchema côté bot.
export const RANK_CARD_DEFAULTS: RankCardStyle = {
  backgroundColor: "#10131A",
  textColor: "#F2F4F8",
  backgroundUrl: null,
  overlayOpacity: 60,
  avatarShape: "circle",
  font: "poppins",
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONTS: Array<[RankCardStyle["font"], string]> = [
  ["poppins", "Poppins"],
  ["bebas", "Bebas (condensée)"],
  ["serif", "Serif"],
  ["mono", "Mono"],
];
const SHAPES: Array<[RankCardStyle["avatarShape"], string]> = [
  ["circle", "Rond"],
  ["rounded", "Arrondi"],
  ["square", "Carré"],
];

function ColorField({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={HEX.test(value) ? value : fallback} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent" aria-label={label} />
        <input value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "font-mono", !HEX.test(value) && "border-[var(--danger)]/60")} />
      </div>
    </Field>
  );
}

/** Vraie carte /rank générée par le bot (tes stats sur ce serveur), 500 ms après le dernier changement. */
function RankCardPreview({ url, accentColor, rankCard }: { url: string; accentColor: string; rankCard: RankCardStyle }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify({ accentColor, rankCard });

  useEffect(() => {
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: key, signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const next = URL.createObjectURL(await res.blob());
        setSrc((old) => {
          if (old) URL.revokeObjectURL(old);
          return next;
        });
      } catch {
        if (!ctrl.signal.aborted) setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [url, key]);

  useEffect(() => () => setSrc((old) => (old && URL.revokeObjectURL(old), null)), []);

  return (
    <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40" style={{ aspectRatio: "934 / 300" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- image blob générée par le bot */}
      {src && <img src={src} alt="Aperçu de la carte /rank" className={cn("h-full w-full object-contain transition-opacity duration-200", loading && "opacity-60")} />}
      {!src && !error && <div className="skeleton-shimmer absolute inset-0" />}
      {error && (
        <p className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <ImageIcon className="h-4 w-4" /> Aperçu indisponible : le bot ne répond pas.
        </p>
      )}
    </div>
  );
}

const LEVELUP_TYPES: Array<[LevelingSettings["levelUpChannelType"], string]> = [
  ["same_channel", "Dans le salon du message"],
  ["specific_channel", "Dans un salon précis"],
  ["dm", "En message privé"],
  ["disabled", "Aucune annonce"],
];
const REWARD_TYPES: Array<[LevelingSettings["rewardAnnounceType"], string]> = [
  ["with_levelup", "Ajoutée au message de niveau"],
  ["same_channel", "Message séparé, dans le salon du message"],
  ["specific_channel", "Message séparé, dans un salon précis"],
  ["dm", "Message séparé, en message privé"],
  ["disabled", "Aucune annonce"],
];
const VARS = ["{user}", "{username}", "{level}", "{xp}", "{server}"];
const REWARD_VARS = ["{user}", "{username}", "{role}", "{level}", "{server}"];

const fill = (tpl: string, extra: Record<string, string> = {}) => {
  const vars: Record<string, string> = { "{user}": "@Lucas", "{username}": "Lucas", "{level}": "12", "{xp}": "1 450", "{server}": "Mon serveur", "{role}": "Actif", ...extra };
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(k).join(v), tpl);
};

/** Aperçu de l'embed tel qu'il apparaît sur Discord. */
function EmbedPreview({ color, title, text }: { color: string; title?: string; text: string }) {
  return (
    <div className="rounded-lg border-l-4 bg-[#2b2d31] p-3 text-sm text-[#dbdee1]" style={{ borderColor: color }}>
      {title && <p className="mb-1 font-bold text-[var(--text-primary)]">{title}</p>}
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Chips({ vars, onPick }: { vars: string[]; onPick: (v: string) => void }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {vars.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)} className="cursor-pointer rounded bg-[var(--surface-raised)]/40 px-1.5 py-0.5 font-mono text-xs text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70">
          {v}
        </button>
      ))}
    </span>
  );
}

interface Props {
  guildId: string;
  config: LevelingSettings;
  saving: boolean;
  disabled: boolean;
  onSave: (patch: Partial<LevelingSettings>) => Promise<void>;
  onOpenBoosts: () => void;
  /** Route du bot qui génère l'aperçu de la carte /rank (absente en mode démo). */
  rankPreviewUrl?: string;
}

/**
 * Page « Niveaux » façon DraftBot : annonce des niveaux avec aperçu, XP des messages et du vocal, salons et rôles ignorés,
 * options supplémentaires, classements, personnalisation et récompenses. Les modifications sont regroupées : la barre du bas
 * enregistre tout d'un coup ; l'interrupteur général s'applique tout de suite.
 */
export default function LevelingSettingsPanel({ guildId, config: rawConfig, saving, disabled, onSave, onOpenBoosts, rankPreviewUrl }: Props) {
  // Un bot pas encore à jour ne renvoie pas rankCard : on complète avec les défauts.
  const config: LevelingSettings = { ...rawConfig, rankCard: { ...RANK_CARD_DEFAULTS, ...(rawConfig.rankCard ?? {}) } };
  const configKey = JSON.stringify(config);
  const [draft, setDraft] = useState<LevelingSettings>(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(config), [configKey]);
  const set = (patch: Partial<LevelingSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const setCard = (patch: Partial<RankCardStyle>) => setDraft((d) => ({ ...d, rankCard: { ...d.rankCard, ...patch } }));
  const [bgDraft, setBgDraft] = useState(config.rankCard.backgroundUrl ?? "");
  useEffect(() => setBgDraft(draft.rankCard.backgroundUrl ?? ""), [draft.rankCard.backgroundUrl]);
  const bgInvalid = bgDraft.trim() !== "" && !/^https:\/\/\S+$/i.test(bgDraft.trim());
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const invalid = draft.minXp > draft.maxXp || !HEX.test(draft.accentColor) || !HEX.test(draft.rankCard.backgroundColor) || !HEX.test(draft.rankCard.textColor) || bgInvalid || (draft.levelUpChannelType === "specific_channel" && !draft.levelUpChannelId) || (draft.rewardAnnounceType === "specific_channel" && !draft.rewardChannelId);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/leaderboard?guildId=${guildId}` : "";

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Niveaux</h2>
          <p className="text-sm text-[var(--text-muted)]">Système de niveaux qui récompense l&apos;activité des membres. Désactivé par défaut : personne ne gagne d&apos;XP tant que vous ne l&apos;activez pas.</p>
        </div>
        <Switch checked={config.enabled} disabled={disabled || saving} label="Activer les niveaux" onChange={(v) => void onSave({ enabled: v })} />
      </div>

      <Section title="Annonce d'un nouveau niveau" text="Message envoyé quand un membre passe un niveau.">
        <div className="space-y-5">
          <Field label="Où annoncer">
            <Select
              value={draft.levelUpChannelType}
              onChange={(v) => set({ levelUpChannelType: v as LevelingSettings["levelUpChannelType"] })}
              className="w-full"
              aria-label="Où annoncer"
              options={LEVELUP_TYPES.map(([k, l]) => ({ id: k, label: l }))}
            />
          </Field>
          {draft.levelUpChannelType === "specific_channel" && (
            <Field label="Salon">
              <ChannelPicker value={draft.levelUpChannelId} guildId={guildId} filterTypes={[0, 5]} onChange={(id) => set({ levelUpChannelId: id || null })} />
            </Field>
          )}
          <Field label="Message personnalisé">
            <textarea value={draft.levelUpMessage} maxLength={500} rows={3} onChange={(e) => set({ levelUpMessage: e.target.value })} className={cn(inputCls, "h-auto py-2")} />
            <Chips vars={VARS} onPick={(v) => set({ levelUpMessage: `${draft.levelUpMessage}${v}`.slice(0, 500) })} />
          </Field>
        </div>
        <Field label="Aperçu">
          <EmbedPreview color={draft.accentColor} title="🎉 Niveau supérieur !" text={fill(draft.levelUpMessage)} />
        </Field>
      </Section>

      <Section title="Gain d'XP" text="Combien d'XP rapporte l'activité.">
        <NumberField label="XP minimum par message" value={draft.minXp} min={1} max={100} onChange={(n) => set({ minXp: n })} />
        <NumberField label="XP maximum par message" value={draft.maxXp} min={5} max={200} hint={draft.minXp > draft.maxXp ? "Le maximum doit être supérieur au minimum." : "Un nombre au hasard entre le minimum et le maximum."} onChange={(n) => set({ maxXp: n })} />
        <NumberField label="Délai entre deux gains (secondes)" value={draft.cooldownSeconds} min={5} max={300} onChange={(n) => set({ cooldownSeconds: n })} />
        <NumberField label="Longueur minimale d'un message" value={draft.minMessageLength} min={0} max={50} hint="Les messages plus courts ne rapportent rien." onChange={(n) => set({ minMessageLength: n })} />
        <NumberField label="Niveau maximum (0 = aucun)" value={draft.maxLevel} min={0} max={1000} onChange={(n) => set({ maxLevel: n })} />
      </Section>

      <Section title="XP en vocal" text="Les membres gagnent de l'XP à chaque minute passée en vocal.">
        <ToggleField label="XP en vocal" text="Activer l'XP dans les salons vocaux" checked={draft.voiceXpEnabled} onChange={(v) => set({ voiceXpEnabled: v })} />
        <NumberField label="XP par minute" value={draft.voiceXpPerMinute} min={1} max={50} disabled={!draft.voiceXpEnabled} onChange={(n) => set({ voiceXpPerMinute: n })} />
        <NumberField label="Membres minimum dans le salon" value={draft.voiceXpMinMembers} min={1} max={10} disabled={!draft.voiceXpEnabled} hint="2 évite de gagner de l'XP tout seul dans un salon." onChange={(n) => set({ voiceXpMinMembers: n })} />
        <ToggleField label="Muet ou en sourdine" text="Pas d'XP tant que le membre est muet ou en sourdine" checked={draft.voiceXpIgnoreMuted} disabled={!draft.voiceXpEnabled} onChange={(v) => set({ voiceXpIgnoreMuted: v })} />
      </Section>

      <Section title="Salons et rôles" text="Où et pour qui l'XP ne compte pas.">
        <Field label="Salons sans gain d'XP" hint="Une catégorie exclut tous ses salons.">
          <MultiChannelPicker guildId={guildId} value={draft.excludedChannelIds} onChange={(v) => set({ excludedChannelIds: v })} />
        </Field>
        <Field label="Rôles sans gain d'XP">
          <MultiRolePicker guildId={guildId} value={draft.excludedRoleIds} onChange={(v) => set({ excludedRoleIds: v })} />
        </Field>
        <div className="lg:col-span-2">
          <button type="button" onClick={onOpenBoosts} className="cursor-pointer text-sm font-semibold text-[#8ea1ff] hover:underline">
            Bonus d&apos;XP par rôle ou par salon → onglet « Boosts »
          </button>
        </div>
      </Section>

      <Section title="Options supplémentaires">
        <ToggleField label="XP dans les fils de discussion" text="Les messages dans les fils rapportent de l'XP" checked={draft.xpInThreads} onChange={(v) => set({ xpInThreads: v })} />
        <ToggleField label="XP dans les forums" text="Les messages dans les posts de forum rapportent de l'XP" checked={draft.xpInForums} onChange={(v) => set({ xpInForums: v })} />
        <ToggleField label="XP des bots" text="Les bots peuvent gagner de l'XP" checked={draft.allowBots} onChange={(v) => set({ allowBots: v })} />
        <ToggleField label="Départ du serveur" text="Conserver l'XP d'un membre qui quitte le serveur" checked={draft.keepXpOnLeave} onChange={(v) => set({ keepXpOnLeave: v })} />
      </Section>

      <Section title="Classements" text="Où les membres peuvent voir le classement.">
        <ToggleField label="Classement sur Discord" text="Autoriser la commande /leaderboard" checked={draft.leaderboardOnDiscord} onChange={(v) => set({ leaderboardOnDiscord: v })} />
        <div className="space-y-2">
          <ToggleField label="Classement en ligne" text="Rendre le classement visible sur une page publique" checked={draft.leaderboardPublic} onChange={(v) => set({ leaderboardPublic: v })} />
          {draft.leaderboardPublic && config.leaderboardPublic && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-[#8ea1ff] hover:underline">
              {publicUrl}
            </a>
          )}
          {draft.leaderboardPublic && !config.leaderboardPublic && <p className="text-xs text-[var(--text-muted)]">Le lien apparaît après l&apos;enregistrement. Seuls le pseudo, l&apos;avatar, le niveau et l&apos;XP sont affichés.</p>}
        </div>
      </Section>

      <Section id="rank-card" title="Personnalisation" text="Couleurs des annonces et apparence de la carte /rank (aussi réglable sur Discord avec /xp carte).">
        <ColorField label="Couleur du système de niveaux" value={draft.accentColor} fallback="#f59e0b" onChange={(v) => set({ accentColor: v })} />
        <ColorField label="Fond de la carte /rank" value={draft.rankCard.backgroundColor} fallback={RANK_CARD_DEFAULTS.backgroundColor} onChange={(v) => setCard({ backgroundColor: v })} />
        <ColorField label="Texte de la carte" value={draft.rankCard.textColor} fallback={RANK_CARD_DEFAULTS.textColor} onChange={(v) => setCard({ textColor: v })} />
        <Field label="Police de la carte">
          <Select value={draft.rankCard.font} onChange={(v) => setCard({ font: v as RankCardStyle["font"] })} className="w-full" aria-label="Police de la carte" options={FONTS.map(([id, label]) => ({ id, label }))} />
        </Field>
        <Field label="Forme de l'avatar">
          <div role="radiogroup" aria-label="Forme de l'avatar" className="flex gap-1 rounded-xl border border-[var(--panel-border)] p-1">
            {SHAPES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={draft.rankCard.avatarShape === id}
                onClick={() => setCard({ avatarShape: id })}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97]",
                  draft.rankCard.avatarShape === id ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Image de fond (lien https)" hint={bgInvalid ? "Le lien doit commencer par https://" : "Laisse vide pour un fond uni."}>
          <input
            value={bgDraft}
            maxLength={500}
            placeholder="https://…"
            onChange={(e) => setBgDraft(e.target.value)}
            onBlur={() => {
              const v = bgDraft.trim();
              if (!v) setCard({ backgroundUrl: null });
              else if (/^https:\/\/\S+$/i.test(v)) setCard({ backgroundUrl: v });
            }}
            className={cn(inputCls, bgInvalid && "border-[var(--danger)]/60")}
          />
        </Field>
        {draft.rankCard.backgroundUrl && (
          <NumberField label="Voile sur l'image (%)" value={draft.rankCard.overlayOpacity} min={0} max={90} hint="Assombrit l'image pour garder le texte lisible." onChange={(n) => setCard({ overlayOpacity: n })} />
        )}
        <div className="space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Aperçu de la carte /rank</span>
            <button type="button" onClick={() => set({ rankCard: RANK_CARD_DEFAULTS })} className="cursor-pointer text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Apparence par défaut
            </button>
          </div>
          {rankPreviewUrl && !disabled ? (
            <RankCardPreview url={rankPreviewUrl} accentColor={draft.accentColor} rankCard={draft.rankCard} />
          ) : (
            <p className="text-xs text-[var(--text-muted)]">L&apos;aperçu apparaît quand le bot est sur ce serveur.</p>
          )}
        </div>
      </Section>

      <Section title="Récompenses de niveau" text="Les rôles eux-mêmes se créent dans l'onglet « Rôles Récompenses ».">
        <Field label="Attribution">
          <Select
            value={draft.rewardType}
            onChange={(v) => set({ rewardType: v as LevelingSettings["rewardType"] })}
            className="w-full"
            aria-label="Attribution"
            options={[
              { id: "cumulative", label: "Cumulative : on garde tous les rôles débloqués" },
              { id: "progressive", label: "Progressive : seul le rôle du palier le plus haut est gardé" },
            ]}
          />
        </Field>
        <Field label="Annonce d'une récompense">
          <Select
            value={draft.rewardAnnounceType}
            onChange={(v) => set({ rewardAnnounceType: v as LevelingSettings["rewardAnnounceType"] })}
            className="w-full"
            aria-label="Annonce d'une récompense"
            options={REWARD_TYPES.map(([k, l]) => ({ id: k, label: l }))}
          />
        </Field>
        {draft.rewardAnnounceType === "specific_channel" && (
          <Field label="Salon des récompenses">
            <ChannelPicker value={draft.rewardChannelId} guildId={guildId} filterTypes={[0, 5]} onChange={(id) => set({ rewardChannelId: id || null })} />
          </Field>
        )}
        {(draft.rewardAnnounceType === "same_channel" || draft.rewardAnnounceType === "specific_channel" || draft.rewardAnnounceType === "dm") && (
          <>
            <Field label="Message de récompense">
              <textarea value={draft.rewardMessage} maxLength={500} rows={3} onChange={(e) => set({ rewardMessage: e.target.value })} className={cn(inputCls, "h-auto py-2")} />
              <Chips vars={REWARD_VARS} onPick={(v) => set({ rewardMessage: `${draft.rewardMessage}${v}`.slice(0, 500) })} />
            </Field>
            <Field label="Aperçu">
              <EmbedPreview color={draft.accentColor} text={fill(draft.rewardMessage)} />
            </Field>
          </>
        )}
      </Section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-[min(92vw,640px)] items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-3">
          <p className="text-sm text-[var(--text-muted)]">{invalid ? "Corrigez les champs en rouge avant d'enregistrer." : "Vous avez des modifications non enregistrées."}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(config)} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Annuler
            </button>
            <button type="button" disabled={saving || invalid || disabled} onClick={() => void onSave(draft)} className="cursor-pointer rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
