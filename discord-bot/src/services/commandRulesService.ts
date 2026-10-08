import { config } from '../config.js';
import { CommandRuleSchema, type CommandRule } from '../types/guildConfig.js';
import { guildConfigService } from './guildConfigService.js';

/**
 * Règles par commande réglées depuis la page « Commandes » de la console : désactivation, rôles autorisés ou interdits,
 * salons autorisés, délai et nombre d'utilisations par membre. Appliquées aux commandes slash comme aux préfixes, en plus
 * des contrôles d'origine (elles ne donnent jamais plus de droits qu'avant).
 */

export const DEFAULT_RULE: CommandRule = CommandRuleSchema.parse({});

export function getCommandRule(guildId: string, commandName: string): CommandRule {
  return guildConfigService.getConfig(guildId).commandRules?.[commandName] ?? DEFAULT_RULE;
}

// ponytail: compteurs en mémoire, remis à zéro au redémarrage du bot ; à persister si des limites longues comptent.
const lastUse = new Map<string, number>();
const uses = new Map<string, number[]>();

export interface RuleCheckInput {
  guildId: string;
  guildOwnerId: string | null;
  commandName: string;
  userId: string;
  /** Salon de la commande, plus le salon parent si c'est un fil. */
  channelIds: string[];
  roleIds: string[];
  now?: number;
}

/** Renvoie le message à afficher si la commande est refusée, sinon null (et compte l'utilisation). */
export function checkCommandRule(input: RuleCheckInput): string | null {
  const { guildId, commandName, userId } = input;
  const rule = getCommandRule(guildId, commandName);
  if (rule === DEFAULT_RULE) return null;
  if (userId === config.botOwnerId) return null;

  const isOwner = userId === input.guildOwnerId || (guildConfigService.getConfig(guildId).ethoOwners ?? []).includes(userId);
  if (isOwner && rule.ownersBypass) return null;

  if (!rule.enabled) return 'Cette commande est désactivée sur ce serveur.';
  if (rule.deniedRoles.some((r) => input.roleIds.includes(r))) return "Un de tes rôles n'a pas le droit d'utiliser cette commande.";
  if (rule.access === 'roles' && !rule.allowedRoles.some((r) => input.roleIds.includes(r))) {
    return 'Cette commande est réservée à certains rôles.';
  }
  if (rule.allowedChannels.length && !rule.allowedChannels.some((c) => input.channelIds.includes(c))) {
    return `Cette commande n'est utilisable que dans ${rule.allowedChannels.map((c) => `<#${c}>`).join(', ')}.`;
  }

  const now = input.now ?? Date.now();
  const key = `${guildId}:${commandName}:${userId}`;
  if (rule.cooldownSeconds > 0) {
    const wait = (lastUse.get(key) ?? 0) + rule.cooldownSeconds * 1000 - now;
    if (wait > 0) return `Patiente encore ${Math.ceil(wait / 1000)} s avant de la réutiliser.`;
  }
  if (rule.maxUses > 0) {
    const windowMs = rule.maxUsesWindowMinutes * 60_000;
    const recent = (uses.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= rule.maxUses) {
      const wait = Math.ceil((recent[0] + windowMs - now) / 60_000);
      return `Limite atteinte : ${rule.maxUses} utilisation${rule.maxUses > 1 ? 's' : ''} par période. Réessaie dans ${wait} min.`;
    }
    recent.push(now);
    uses.set(key, recent);
  }
  if (rule.cooldownSeconds > 0) lastUse.set(key, now);
  return null;
}
