"use client";

import { useEffect, useState } from "react";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { MultiChannelPicker, MultiRolePicker } from "@/components/discord/MultiPickers";
import { Field, NumberField, Section, Switch, ToggleField, inputCls } from "@/components/discord/SettingsUI";
import { cn } from "@/lib/utils";

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
  rewardAnnounceType: "with_levelup" | "same_channel" | "specific_channel" | "dm" | "disabled";
  rewardChannelId: string | null;
  rewardMessage: string;
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
    <div className="rounded-lg border-l-4 bg-[#2b2d31] p-3 text-[13px] text-[#dbdee1]" style={{ borderColor: color }}>
      {title && <p className="mb-1 font-bold text-white">{title}</p>}
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Chips({ vars, onPick }: { vars: string[]; onPick: (v: string) => void }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {vars.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)} className="cursor-pointer rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-zinc-700">
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
}

/**
 * Page « Niveaux » façon DraftBot : annonce des niveaux avec aperçu, XP des messages et du vocal, salons et rôles ignorés,
 * options supplémentaires, classements, personnalisation et récompenses. Les modifications sont regroupées : la barre du bas
 * enregistre tout d'un coup ; l'interrupteur général s'applique tout de suite.
 */
export default function LevelingSettingsPanel({ guildId, config, saving, disabled, onSave, onOpenBoosts }: Props) {
  const [draft, setDraft] = useState<LevelingSettings>(config);
  useEffect(() => setDraft(config), [config]);
  const set = (patch: Partial<LevelingSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const invalid = draft.minXp > draft.maxXp || !/^#[0-9a-fA-F]{6}$/.test(draft.accentColor) || (draft.levelUpChannelType === "specific_channel" && !draft.levelUpChannelId) || (draft.rewardAnnounceType === "specific_channel" && !draft.rewardChannelId);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/leaderboard?guildId=${guildId}` : "";

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-white/[0.03] p-4">
        <div>
          <h2 className="text-lg font-bold text-white">Niveaux</h2>
          <p className="text-sm text-zinc-400">Système de niveaux qui récompense l&apos;activité des membres. Désactivé par défaut : personne ne gagne d&apos;XP tant que vous ne l&apos;activez pas.</p>
        </div>
        <Switch checked={config.enabled} disabled={disabled || saving} label="Activer les niveaux" onChange={(v) => void onSave({ enabled: v })} />
      </div>

      <Section title="Annonce d'un nouveau niveau" text="Message envoyé quand un membre passe un niveau.">
        <div className="space-y-5">
          <Field label="Où annoncer">
            <select value={draft.levelUpChannelType} onChange={(e) => set({ levelUpChannelType: e.target.value as LevelingSettings["levelUpChannelType"] })} className={inputCls}>
              {LEVELUP_TYPES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
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
          {draft.leaderboardPublic && !config.leaderboardPublic && <p className="text-[11px] text-zinc-500">Le lien apparaît après l&apos;enregistrement. Seuls le pseudo, l&apos;avatar, le niveau et l&apos;XP sont affichés.</p>}
        </div>
      </Section>

      <Section title="Personnalisation">
        <Field label="Couleur du système de niveaux" hint="Utilisée pour les annonces et le classement sur Discord.">
          <div className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(draft.accentColor) ? draft.accentColor : "#f59e0b"} onChange={(e) => set({ accentColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent" aria-label="Couleur" />
            <input value={draft.accentColor} maxLength={7} onChange={(e) => set({ accentColor: e.target.value })} className={cn(inputCls, "font-mono", !/^#[0-9a-fA-F]{6}$/.test(draft.accentColor) && "border-rose-500/60")} />
          </div>
        </Field>
      </Section>

      <Section title="Récompenses de niveau" text="Les rôles eux-mêmes se créent dans l'onglet « Rôles Récompenses ».">
        <Field label="Attribution">
          <select value={draft.rewardType} onChange={(e) => set({ rewardType: e.target.value as LevelingSettings["rewardType"] })} className={inputCls}>
            <option value="cumulative">Cumulative : on garde tous les rôles débloqués</option>
            <option value="progressive">Progressive : seul le rôle du palier le plus haut est gardé</option>
          </select>
        </Field>
        <Field label="Annonce d'une récompense">
          <select value={draft.rewardAnnounceType} onChange={(e) => set({ rewardAnnounceType: e.target.value as LevelingSettings["rewardAnnounceType"] })} className={inputCls}>
            {REWARD_TYPES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
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
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-[min(92vw,640px)] items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-3 shadow-2xl">
          <p className="text-sm text-zinc-300">{invalid ? "Corrigez les champs en rouge avant d'enregistrer." : "Vous avez des modifications non enregistrées."}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(config)} className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-white">
              Annuler
            </button>
            <button type="button" disabled={saving || invalid || disabled} onClick={() => void onSave(draft)} className="cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
