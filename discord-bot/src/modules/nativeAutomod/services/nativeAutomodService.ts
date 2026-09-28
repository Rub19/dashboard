import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  PermissionFlagsBits,
  type Guild,
} from 'discord.js';
import { z } from 'zod';
import { logger } from '../../../utils/logger.js';

/**
 * AutoMod NATIF de Discord (Paramètres du serveur > AutoMod) : les règles vivent chez Discord et
 * s'exécutent même bot hors ligne. Ce service n'est qu'une passerelle typée et validée vers
 * `guild.autoModerationRules` (le moteur automod maison du bot est un module distinct).
 */

/** Erreur « volontaire » : son message (français, sans texte brut Discord) peut être montré au client. */
export class NativeAutomodError extends Error {
  constructor(message: string, public readonly httpStatus = 400) {
    super(message);
  }
}

export const TRIGGER_TYPES = ['keyword', 'spam', 'keyword_preset', 'mention_spam', 'member_profile'] as const;
export type TriggerKey = (typeof TRIGGER_TYPES)[number];

const TRIGGER_ENUM: Record<TriggerKey, AutoModerationRuleTriggerType> = {
  keyword: AutoModerationRuleTriggerType.Keyword,
  spam: AutoModerationRuleTriggerType.Spam,
  keyword_preset: AutoModerationRuleTriggerType.KeywordPreset,
  mention_spam: AutoModerationRuleTriggerType.MentionSpam,
  member_profile: AutoModerationRuleTriggerType.MemberProfile,
};

/** Quotas par serveur imposés par Discord. */
export const TRIGGER_QUOTAS: Record<TriggerKey, number> = { keyword: 6, spam: 1, keyword_preset: 1, mention_spam: 1, member_profile: 1 };

export const TRIGGER_LABELS: Record<TriggerKey, string> = {
  keyword: 'Mots-clés',
  spam: 'Spam suspect',
  keyword_preset: 'Listes prédéfinies',
  mention_spam: 'Spam de mentions',
  member_profile: 'Profil des membres',
};

export const PRESET_KEYS = ['profanity', 'sexual_content', 'slurs'] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];
const PRESET_ENUM: Record<PresetKey, AutoModerationRuleKeywordPresetType> = {
  profanity: AutoModerationRuleKeywordPresetType.Profanity,
  sexual_content: AutoModerationRuleKeywordPresetType.SexualContent,
  slurs: AutoModerationRuleKeywordPresetType.Slurs,
};
export const PRESET_LABELS: Record<PresetKey, string> = {
  profanity: 'Grossièretés',
  sexual_content: 'Contenu sexuel',
  slurs: 'Insultes et propos haineux',
};

const ACTION_KEYS = ['block_message', 'send_alert', 'timeout', 'block_member_interaction'] as const;
type ActionKey = (typeof ACTION_KEYS)[number];
const ACTION_ENUM: Record<ActionKey, AutoModerationActionType> = {
  block_message: AutoModerationActionType.BlockMessage,
  send_alert: AutoModerationActionType.SendAlertMessage,
  timeout: AutoModerationActionType.Timeout,
  block_member_interaction: AutoModerationActionType.BlockMemberInteraction,
};

const MAX_TIMEOUT_SECONDS = 28 * 24 * 3600;
const SNOWFLAKE = z.string().regex(/^\d{15,25}$/, 'Identifiant Discord invalide.');

const actionSchema = z
  .object({
    type: z.enum(ACTION_KEYS, { errorMap: () => ({ message: "Type d'action inconnu." }) }),
    channelId: SNOWFLAKE.optional(),
    durationSeconds: z.number({ invalid_type_error: 'La durée doit être un nombre.' }).int().optional(),
    customMessage: z.string().max(150, 'Le message personnalisé ne doit pas dépasser 150 caractères.').optional(),
  })
  .superRefine((a, ctx) => {
    if (a.type === 'send_alert' && !a.channelId) {
      ctx.addIssue({ code: 'custom', message: "L'alerte nécessite un salon de destination." });
    }
    if (a.type === 'timeout') {
      if (a.durationSeconds === undefined || a.durationSeconds < 60 || a.durationSeconds > MAX_TIMEOUT_SECONDS) {
        ctx.addIssue({ code: 'custom', message: "La durée de l'exclusion temporaire doit être comprise entre 1 minute et 28 jours." });
      }
    }
  });

const keywordList = z
  .array(z.string().trim().min(1, 'Un mot-clé ne peut pas être vide.').max(60, 'Un mot-clé ne doit pas dépasser 60 caractères.'))
  .max(1000, 'Maximum 1000 mots-clés.');

export const ruleInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Le nom de la règle est obligatoire.').max(100, 'Le nom ne doit pas dépasser 100 caractères.'),
    triggerType: z.enum(TRIGGER_TYPES, { errorMap: () => ({ message: 'Type de déclencheur inconnu.' }) }),
    enabled: z.boolean().default(true),
    keywords: keywordList.default([]),
    regexPatterns: z
      .array(z.string().trim().min(1, 'Une expression régulière ne peut pas être vide.').max(260, 'Une expression régulière ne doit pas dépasser 260 caractères.'))
      .max(10, 'Maximum 10 expressions régulières.')
      .default([]),
    allowList: z.array(z.string().trim().min(1).max(60, 'Une exception ne doit pas dépasser 60 caractères.')).max(100, 'Maximum 100 exceptions.').default([]),
    presets: z.array(z.enum(PRESET_KEYS, { errorMap: () => ({ message: 'Liste prédéfinie inconnue.' }) })).max(3).default([]),
    mentionTotalLimit: z.number({ invalid_type_error: 'La limite de mentions doit être un nombre.' }).int().min(1, 'La limite de mentions est comprise entre 1 et 50.').max(50, 'La limite de mentions est comprise entre 1 et 50.').optional(),
    mentionRaidProtection: z.boolean().default(false),
    actions: z.array(actionSchema).max(4).default([]),
    exemptRoles: z.array(SNOWFLAKE).max(20, 'Maximum 20 rôles exemptés.').default([]),
    exemptChannels: z.array(SNOWFLAKE).max(50, 'Maximum 50 salons exemptés.').default([]),
  })
  .superRefine((r, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (r.actions.length === 0) issue('Ajoutez au moins une action.');
    if (r.triggerType === 'keyword' || r.triggerType === 'member_profile') {
      if (r.keywords.length + r.regexPatterns.length === 0) issue('Indiquez au moins un mot-clé ou une expression régulière.');
    }
    if (r.triggerType === 'keyword_preset' && r.presets.length === 0) issue('Choisissez au moins une liste prédéfinie.');
    if (r.triggerType === 'mention_spam' && r.mentionTotalLimit === undefined) issue('Indiquez la limite de mentions par message.');
    if (r.triggerType === 'member_profile' && r.actions.some((a) => a.type === 'block_message')) {
      issue("Bloquer le message n'est pas possible pour une règle sur le profil des membres.");
    }
    if (r.actions.some((a) => a.type === 'timeout') && r.triggerType !== 'keyword' && r.triggerType !== 'mention_spam') {
      issue("L'exclusion temporaire n'est disponible que pour les règles Mots-clés et Spam de mentions.");
    }
  });

export type NativeRuleInput = z.input<typeof ruleInputSchema>;
export type ParsedRuleInput = z.output<typeof ruleInputSchema>;

/** Modification partielle : le type de déclencheur n'est pas modifiable (limite Discord). */
export const rulePatchSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
  regexPatterns: z.array(z.string()).optional(),
  allowList: z.array(z.string()).optional(),
  presets: z.array(z.string()).optional(),
  mentionTotalLimit: z.number().optional(),
  mentionRaidProtection: z.boolean().optional(),
  actions: z.array(z.any()).optional(),
  exemptRoles: z.array(z.string()).optional(),
  exemptChannels: z.array(z.string()).optional(),
});
export type NativeRulePatch = z.infer<typeof rulePatchSchema>;

export interface NativeActionView {
  type: ActionKey;
  channelId?: string;
  durationSeconds?: number;
  customMessage?: string;
}

export interface NativeRuleView {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: TriggerKey | 'unknown';
  eventType: 'message_send' | 'member_update' | 'unknown';
  triggerMetadata: {
    keywordFilter: string[];
    regexPatterns: string[];
    allowList: string[];
    presets: PresetKey[];
    mentionTotalLimit: number | null;
    mentionRaidProtectionEnabled: boolean;
  };
  actions: NativeActionView[];
  exemptRoles: string[];
  exemptChannels: string[];
  creatorId: string;
}

const invert = <K extends string, V extends number>(m: Record<K, V>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v as number, k])) as Record<number, K>;
const TRIGGER_BY_ENUM = invert(TRIGGER_ENUM);
const PRESET_BY_ENUM = invert(PRESET_ENUM);
const ACTION_BY_ENUM = invert(ACTION_ENUM);

const idsOf = (c: unknown): string[] => (c && typeof (c as Map<string, unknown>).keys === 'function' ? [...(c as Map<string, unknown>).keys()] : []);

/** Vue JSON simple d'une règle discord.js. */
export function toView(rule: any): NativeRuleView {
  const md = rule.triggerMetadata ?? {};
  return {
    id: rule.id,
    name: rule.name,
    enabled: !!rule.enabled,
    triggerType: TRIGGER_BY_ENUM[rule.triggerType] ?? 'unknown',
    eventType: rule.eventType === AutoModerationRuleEventType.MessageSend ? 'message_send' : rule.eventType === AutoModerationRuleEventType.MemberUpdate ? 'member_update' : 'unknown',
    triggerMetadata: {
      keywordFilter: [...(md.keywordFilter ?? [])],
      regexPatterns: [...(md.regexPatterns ?? [])],
      allowList: [...(md.allowList ?? [])],
      presets: [...(md.presets ?? [])].map((p) => PRESET_BY_ENUM[p as number]).filter(Boolean),
      mentionTotalLimit: md.mentionTotalLimit ?? null,
      mentionRaidProtectionEnabled: !!md.mentionRaidProtectionEnabled,
    },
    actions: (rule.actions ?? []).map((a: any): NativeActionView => {
      const out: NativeActionView = { type: ACTION_BY_ENUM[a.type] ?? 'block_message' };
      if (a.metadata?.channelId) out.channelId = a.metadata.channelId;
      if (a.metadata?.durationSeconds) out.durationSeconds = a.metadata.durationSeconds;
      if (a.metadata?.customMessage) out.customMessage = a.metadata.customMessage;
      return out;
    }),
    exemptRoles: idsOf(rule.exemptRoles),
    exemptChannels: idsOf(rule.exemptChannels),
    creatorId: rule.creatorId,
  };
}

/** Message français lisible pour une erreur Zod (les messages sont déjà en français). */
function zodMessage(err: z.ZodError): string {
  return [...new Set(err.issues.map((i) => i.message))].join(' ');
}

/**
 * Traduit une erreur de l'API Discord en message français ; le texte brut n'est jamais renvoyé
 * (il part dans les logs).
 */
export function mapDiscordError(err: unknown): NativeAutomodError {
  if (err instanceof NativeAutomodError) return err;
  const e = err as { code?: unknown; status?: unknown } | null;
  const code = typeof e?.code === 'number' ? e.code : undefined;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  logger.warn('[NativeAutomod] Erreur Discord', err);
  if (code === 50013 || code === 50001 || status === 403) {
    return new NativeAutomodError("Le bot n'a pas la permission « Gérer le serveur » nécessaire pour gérer l'AutoMod de Discord. Ajoutez-la à son rôle puis réessayez.", 403);
  }
  if (status === 404 || code === 10066) return new NativeAutomodError('Règle introuvable : elle a peut-être été supprimée depuis Discord.', 404);
  if ((code !== undefined && code >= 200000 && code < 201000) || (code !== undefined && code >= 30000 && code < 31000)) {
    return new NativeAutomodError('Discord refuse cette règle : le nombre maximal de règles de ce type est atteint sur le serveur.', 409);
  }
  if (status === 429) return new NativeAutomodError('Discord limite temporairement les requêtes. Réessayez dans quelques secondes.', 429);
  if (status === 400) return new NativeAutomodError("Discord a refusé cette règle : vérifiez les mots-clés, expressions régulières (syntaxe Rust) et actions.", 400);
  return new NativeAutomodError("Impossible de contacter Discord pour gérer l'AutoMod. Réessayez plus tard.", 502);
}

function assertBotPermissions(guild: Guild, needsTimeout: boolean): void {
  const perms = guild.members?.me?.permissions;
  if (!perms) return;
  if (!perms.has(PermissionFlagsBits.ManageGuild)) {
    throw new NativeAutomodError("Le bot n'a pas la permission « Gérer le serveur » nécessaire pour gérer l'AutoMod de Discord.", 403);
  }
  if (needsTimeout && !perms.has(PermissionFlagsBits.ModerateMembers)) {
    throw new NativeAutomodError("L'action d'exclusion temporaire nécessite la permission « Exclure temporairement des membres » pour le bot.", 403);
  }
}

function assertAlertChannels(guild: Guild, input: ParsedRuleInput): void {
  for (const a of input.actions) {
    if (a.type !== 'send_alert') continue;
    const ch: any = guild.channels?.cache?.get(a.channelId!);
    if (!ch) throw new NativeAutomodError("Le salon d'alerte est introuvable sur ce serveur.");
    if (typeof ch.isTextBased === 'function' && !ch.isTextBased()) throw new NativeAutomodError("Le salon d'alerte doit être un salon textuel.");
  }
}

function toDiscordActions(input: ParsedRuleInput) {
  return input.actions.map((a) => {
    const metadata: Record<string, unknown> = {};
    if (a.type === 'send_alert') metadata.channel = a.channelId;
    if (a.type === 'timeout') metadata.durationSeconds = a.durationSeconds;
    if (a.type === 'block_message' && a.customMessage) metadata.customMessage = a.customMessage;
    return { type: ACTION_ENUM[a.type], ...(Object.keys(metadata).length ? { metadata } : {}) } as any;
  });
}

function toTriggerMetadata(input: ParsedRuleInput) {
  switch (input.triggerType) {
    case 'keyword':
    case 'member_profile':
      return { keywordFilter: input.keywords, regexPatterns: input.regexPatterns, allowList: input.allowList };
    case 'keyword_preset':
      return { presets: input.presets.map((p) => PRESET_ENUM[p]), allowList: input.allowList };
    case 'mention_spam':
      return { mentionTotalLimit: input.mentionTotalLimit, mentionRaidProtectionEnabled: input.mentionRaidProtection };
    default:
      return {};
  }
}

async function fetchRules(guild: Guild): Promise<any[]> {
  try {
    const col: any = await guild.autoModerationRules.fetch();
    return [...col.values()];
  } catch (err) {
    throw mapDiscordError(err);
  }
}

/** Reconstitue une entrée complète (pour re-validation) à partir de la vue d'une règle existante. */
function viewToInput(v: NativeRuleView): NativeRuleInput {
  return {
    name: v.name,
    triggerType: v.triggerType as TriggerKey,
    enabled: v.enabled,
    keywords: v.triggerMetadata.keywordFilter,
    regexPatterns: v.triggerMetadata.regexPatterns,
    allowList: v.triggerMetadata.allowList,
    presets: v.triggerMetadata.presets,
    mentionTotalLimit: v.triggerMetadata.mentionTotalLimit ?? undefined,
    mentionRaidProtection: v.triggerMetadata.mentionRaidProtectionEnabled,
    actions: v.actions,
    exemptRoles: v.exemptRoles,
    exemptChannels: v.exemptChannels,
  };
}

function parseInput(input: unknown): ParsedRuleInput {
  const r = ruleInputSchema.safeParse(input);
  if (!r.success) throw new NativeAutomodError(zodMessage(r.error));
  return r.data;
}

export const nativeAutomodService = {
  async list(guild: Guild): Promise<NativeRuleView[]> {
    return (await fetchRules(guild)).map(toView);
  },

  async create(guild: Guild, input: unknown, reason?: string): Promise<NativeRuleView> {
    const data = parseInput(input);
    const existing = await fetchRules(guild);
    const count = existing.filter((r) => r.triggerType === TRIGGER_ENUM[data.triggerType]).length;
    if (count >= TRIGGER_QUOTAS[data.triggerType]) {
      throw new NativeAutomodError(
        `Limite atteinte : Discord n'autorise que ${TRIGGER_QUOTAS[data.triggerType]} règle(s) « ${TRIGGER_LABELS[data.triggerType]} » par serveur.`,
        409
      );
    }
    assertBotPermissions(guild, data.actions.some((a) => a.type === 'timeout'));
    assertAlertChannels(guild, data);
    try {
      const rule = await guild.autoModerationRules.create({
        name: data.name,
        eventType: data.triggerType === 'member_profile' ? AutoModerationRuleEventType.MemberUpdate : AutoModerationRuleEventType.MessageSend,
        triggerType: TRIGGER_ENUM[data.triggerType],
        triggerMetadata: toTriggerMetadata(data),
        actions: toDiscordActions(data),
        enabled: data.enabled,
        exemptRoles: data.exemptRoles,
        exemptChannels: data.exemptChannels,
        reason,
      });
      return toView(rule);
    } catch (err) {
      throw mapDiscordError(err);
    }
  },

  async update(guild: Guild, ruleId: string, patch: unknown, reason?: string): Promise<NativeRuleView> {
    const p = rulePatchSchema.safeParse(patch);
    if (!p.success) throw new NativeAutomodError(zodMessage(p.error));
    const current = (await fetchRules(guild)).find((r) => r.id === ruleId);
    if (!current) throw new NativeAutomodError('Règle introuvable : elle a peut-être été supprimée depuis Discord.', 404);
    const view = toView(current);
    if (view.triggerType === 'unknown') throw new NativeAutomodError("Ce type de règle n'est pas modifiable depuis ici.");
    const defined = Object.fromEntries(Object.entries(p.data).filter(([, v]) => v !== undefined));
    const data = parseInput({ ...viewToInput(view), ...defined, triggerType: view.triggerType });
    assertBotPermissions(guild, data.actions.some((a) => a.type === 'timeout'));
    assertAlertChannels(guild, data);
    try {
      const rule = await guild.autoModerationRules.edit(ruleId, {
        name: data.name,
        triggerMetadata: toTriggerMetadata(data),
        actions: toDiscordActions(data),
        enabled: data.enabled,
        exemptRoles: data.exemptRoles,
        exemptChannels: data.exemptChannels,
        reason,
      });
      return toView(rule);
    } catch (err) {
      throw mapDiscordError(err);
    }
  },

  async toggle(guild: Guild, ruleId: string, enabled: boolean, reason?: string): Promise<NativeRuleView> {
    if (typeof enabled !== 'boolean') throw new NativeAutomodError("L'état « activé » doit être vrai ou faux.");
    assertBotPermissions(guild, false);
    try {
      return toView(await guild.autoModerationRules.edit(ruleId, { enabled, reason }));
    } catch (err) {
      throw mapDiscordError(err);
    }
  },

  async remove(guild: Guild, ruleId: string, reason?: string): Promise<void> {
    assertBotPermissions(guild, false);
    try {
      await guild.autoModerationRules.delete(ruleId, reason);
    } catch (err) {
      throw mapDiscordError(err);
    }
  },

  /**
   * Jeu standard : listes prédéfinies (grossièretés / contenu sexuel / insultes) + spam suspect + limite de
   * mentions. Les types déjà présents (quota 1) sont ignorés, jamais écrasés.
   */
  async createRecommended(guild: Guild, opts: { alertChannelId?: string; reason?: string } = {}) {
    const alert = opts.alertChannelId ? [{ type: 'send_alert' as const, channelId: opts.alertChannelId }] : [];
    const block = (msg: string) => [{ type: 'block_message' as const, customMessage: msg }, ...alert];
    const plan: NativeRuleInput[] = [
      { name: 'ETHONE • Langage inapproprié', triggerType: 'keyword_preset', presets: [...PRESET_KEYS], actions: block('Ce message a été bloqué : langage inapproprié.') },
      { name: 'ETHONE • Spam suspect', triggerType: 'spam', actions: block('Ce message a été bloqué : spam suspecté.') },
      { name: 'ETHONE • Spam de mentions', triggerType: 'mention_spam', mentionTotalLimit: 8, mentionRaidProtection: true, actions: block('Ce message a été bloqué : trop de mentions.') },
    ];
    const present = new Set((await fetchRules(guild)).map((r) => r.triggerType));
    const created: NativeRuleView[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    for (const rule of plan) {
      if (present.has(TRIGGER_ENUM[rule.triggerType])) {
        skipped.push({ name: rule.name, reason: `Une règle « ${TRIGGER_LABELS[rule.triggerType]} » existe déjà (limite Discord : 1).` });
        continue;
      }
      created.push(await this.create(guild, rule, opts.reason));
    }
    return { created, skipped };
  },
};
