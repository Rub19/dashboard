import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { musicPersistence } from '../storage/musicPersistence.js';

export class MusicPermissionService {
  public static canExecuteAction(
    member: GuildMember | null,
    guildId: string,
    action: 'PLAY' | 'PAUSE' | 'RESUME' | 'SKIP' | 'STOP' | 'VOLUME' | 'SEEK' | 'SHUFFLE' | 'CLEAR' | 'REPEAT' | 'REMOVE',
    targetItemAuthorId?: string
  ): { allowed: boolean; reason?: string } {
    // Si pas d'information de membre (ex: dashboard sans member Discord explicite mais avec session admin)
    if (!member) {
      return { allowed: true };
    }

    // 1. Administrateurs et Modérateurs ont tous les droits
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      return { allowed: true };
    }

    const settings = musicPersistence.getSettings(guildId);

    // 2. Mode DJ activé
    if (settings.djMode) {
      if (!settings.djRoleId) {
        return { allowed: false, reason: 'Le mode DJ est actif mais aucun rôle DJ n\'est configuré.' };
      }

      const hasDjRole = member.roles.cache.has(settings.djRoleId);
      if (!hasDjRole) {
        return { allowed: false, reason: 'Cette action nécessite le rôle DJ configuré sur le serveur.' };
      }
    }

    // 3. Règles spécifiques par action
    if (action === 'VOLUME' && !settings.allowUserChangeVolume) {
      return { allowed: false, reason: 'Le changement de volume par les membres est désactivé.' };
    }

    if (action === 'SKIP' && !settings.allowUserSkip) {
      return { allowed: false, reason: 'Le passage de piste (skip) par les membres est désactivé.' };
    }

    if (action === 'REMOVE' && targetItemAuthorId && targetItemAuthorId !== member.id && !settings.allowUserRemoveOwn) {
      return { allowed: false, reason: 'Vous ne pouvez retirer que les musiques que vous avez ajoutées.' };
    }

    return { allowed: true };
  }
}
