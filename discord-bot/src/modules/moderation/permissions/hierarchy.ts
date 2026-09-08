import { GuildMember } from 'discord.js';
import { ownerImmunityService } from '../../../services/ownerImmunityService.js';

export interface HierarchyCheckResult {
  allowed: boolean;
  reason?: string;
  /**
   * True quand le Bot Owner s'auto-cible avec le God Mode toujours actif : la
   * commande doit s'exécuter en mode test (log, DM, embed identiques à une
   * vraie sanction) SANS jamais appeler la véritable action Discord punitive
   * (timeout/ban/kick réels) — pratique pour prévisualiser le rendu d'une
   * commande sans jamais risquer de s'auto-exclure de son propre serveur.
   */
  dryRun?: boolean;
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
  // 0bis. Le Bot Owner qui s'auto-cible (avec le God Mode actif) passe en mode test :
  // autorisé, mais la commande appelante doit sauter l'action Discord réelle et se
  // contenter de simuler (log + DM + embed) — voir `dryRun` ci-dessus. Cette règle
  // est vérifiée AVANT l'immunité générale (0) et l'anti-auto-sanction (1) ci-dessous,
  // qui bloqueraient sinon ce cas précis.
  if (moderator.id === target.id && ownerImmunityService.isOwnerImmune(moderator.id)) {
    return { allowed: true, dryRun: true };
  }

  // 0. Le Bot Owner est immunisé contre toute sanction, sur absolument tous les serveurs —
  // qu'il soit propriétaire du serveur ou non. Cette immunité est globale et volontaire
  // (protection "god mode"), distincte de la vérification de hiérarchie de rôles ci-dessous.
  if (ownerImmunityService.isOwnerImmune(target.id)) {
    return {
      allowed: false,
      reason: 'Cette personne est le propriétaire du bot : elle est immunisée contre toute sanction (`/godmode` pour désactiver temporairement).',
    };
  }

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
