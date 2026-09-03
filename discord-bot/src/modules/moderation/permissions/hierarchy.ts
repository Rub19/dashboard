import { GuildMember } from 'discord.js';

export interface HierarchyCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Vérifie si un modérateur peut exécuter une action disciplinaire sur une cible donnée
 * en respectant scrupuleusement la hiérarchie des rôles Discord.
 */
export function checkHierarchy(
  moderator: GuildMember,
  target: GuildMember,
  botMember: GuildMember
): HierarchyCheckResult {
  // 1. On ne peut pas se sanctionner soi-même
  if (moderator.id === target.id) {
    return {
      allowed: false,
      reason: 'Vous ne pouvez pas exécuter une sanction sur vous-même.',
    };
  }

  // 2. On ne peut pas sanctionner le bot
  if (target.id === botMember.id) {
    return {
      allowed: false,
      reason: 'Vous ne pouvez pas exécuter une sanction sur le bot.',
    };
  }

  // 3. On ne peut pas sanctionner le propriétaire du serveur
  if (target.id === target.guild.ownerId) {
    return {
      allowed: false,
      reason: 'Impossible de sanctionner le propriétaire du serveur.',
    };
  }

  // 4. Le bot doit avoir un rôle supérieur à la cible
  if (!target.manageable) {
    return {
      allowed: false,
      reason: 'Le bot ne possède pas un rôle suffisamment élevé pour modérer ce membre.',
    };
  }

  // 5. Si le modérateur n'est pas le propriétaire du serveur, son rôle le plus haut doit dépasser celui de la cible
  if (moderator.id !== moderator.guild.ownerId) {
    const modHighest = moderator.roles.highest.position;
    const targetHighest = target.roles.highest.position;

    if (modHighest <= targetHighest) {
      return {
        allowed: false,
        reason:
          'Vous ne pouvez pas sanctionner un membre possédant un rôle égal ou supérieur au vôtre.',
      };
    }
  }

  return { allowed: true };
}
