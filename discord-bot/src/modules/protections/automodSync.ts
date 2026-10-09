import { AutoModerationActionType, AutoModerationRuleEventType, AutoModerationRuleTriggerType, Guild } from 'discord.js';
import { protectionStore } from './protectionStore.js';
import { logger } from '../../utils/logger.js';

const RULE_NAME: Record<string, string> = { antiLink: 'Etho · Anti-lien', antiBadWord: 'Etho · Anti-BadWord' };

const LINK_PATTERNS: Record<string, string> = {
  general: 'https?://\\S+',
  discord: '(discord(app)?\\.com/invite|discord\\.gg|dsc\\.gg)/\\S+',
  images: 'https?://\\S+\\.(png|jpe?g|gif|webp)',
};

/**
 * Mode « AutoMod Discord » : la règle est appliquée par Discord lui-même (message bloqué avant d'être publié).
 * Désactivée ou repassée en mode Etho : la règle Etho est supprimée.
 */
export async function syncAutomodRule(guild: Guild, key: 'antiLink' | 'antiBadWord'): Promise<string | null> {
  const s = protectionStore.get(guild.id, key);
  const rules = await guild.autoModerationRules.fetch().catch(() => null);
  if (!rules) return 'Etho ne peut pas lire les règles AutoMod (permission « Gérer le serveur »).';
  const existing = rules.find((r) => r.name === RULE_NAME[key] && r.creatorId === guild.client.user?.id);
  const wanted = s.enabled && s.enforcement === 'automod';
  if (!wanted) {
    await existing?.delete('Etho · mode AutoMod désactivé').catch(() => {});
    return null;
  }
  const triggerMetadata =
    key === 'antiLink'
      ? {
          regexPatterns: (s.linkTypes ?? ['general', 'discord']).map((t) => LINK_PATTERNS[t]).filter(Boolean),
          allowList: (s.allowedDomains ?? []).slice(0, 100).map((d) => `*${d.replace(/^https?:\/\//, '').replace(/^www\./, '')}*`),
        }
      : { keywordFilter: (s.bannedWords ?? []).slice(0, 1000) };
  if (key === 'antiBadWord' && !triggerMetadata.keywordFilter?.length) return 'Ajoute au moins un mot interdit.';
  const actions = [
    { type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Message bloqué par Etho.' } },
    ...(s.logChannelId ? [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: s.logChannelId } }] : []),
    ...(s.punish === 'timeout' ? [{ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: Math.min(s.timeoutSeconds, 28 * 86400) } }] : []),
  ];
  const data = {
    name: RULE_NAME[key],
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata,
    actions,
    enabled: true,
    exemptRoles: s.wlRoles.slice(0, 20),
    exemptChannels: [...s.wlChannels, ...s.wlCategories].slice(0, 50),
    reason: 'Etho · protection en mode AutoMod',
  };
  try {
    if (existing) await existing.edit(data);
    else await guild.autoModerationRules.create(data);
    return null;
  } catch (err) {
    logger.warn(`[Protections] Règle AutoMod ${key} :`, (err as Error)?.message);
    return 'Discord a refusé la règle AutoMod (limite de règles atteinte ou permission manquante).';
  }
}
