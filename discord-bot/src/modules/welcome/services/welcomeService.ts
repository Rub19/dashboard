import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  PartialGuildMember,
  TextChannel,
  User,
} from 'discord.js';
import {
  FullWelcomeConfig,
  GoodbyeMessageConfig,
  WelcomeButtonConfig,
  WelcomeMessageConfig,
} from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { VariableParser } from '../variables/variableParser.js';
import { WelcomeCardGenerator } from '../images/welcomeCardGenerator.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { AutoRoleService } from './autoRoleService.js';
import { OnboardingService } from './onboardingService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class WelcomeService {
  public getConfig(guildId: string): FullWelcomeConfig {
    return welcomeRepository.getConfig(guildId);
  }

  public updateConfig(guildId: string, update: Partial<FullWelcomeConfig>): FullWelcomeConfig {
    const current = this.getConfig(guildId);
    const merged: FullWelcomeConfig = {
      welcome: {
        ...current.welcome,
        ...(update.welcome || {}),
        embed: {
          ...current.welcome.embed,
          ...(update.welcome?.embed || {}),
        },
        image: {
          ...current.welcome.image,
          ...(update.welcome?.image || {}),
        },
        buttons: update.welcome?.buttons || current.welcome.buttons || [],
        dm: {
          ...current.welcome.dm,
          ...(update.welcome?.dm || {}),
        },
        conditions: {
          ...current.welcome.conditions,
          ...(update.welcome?.conditions || {}),
        },
      },
      goodbye: {
        ...current.goodbye,
        ...(update.goodbye || {}),
        embed: {
          ...current.goodbye.embed,
          ...(update.goodbye?.embed || {}),
        },
        image: {
          ...current.goodbye.image,
          ...(update.goodbye?.image || {}),
        },
        buttons: update.goodbye?.buttons || current.goodbye.buttons || [],
      },
    };

    welcomeRepository.saveConfig(guildId, merged);
    return merged;
  }

  // ==========================================
  // Traitement Arrivée d'un Membre
  // ==========================================
  public async handleMemberAdd(member: GuildMember): Promise<void> {
    const guild = member.guild;
    const globalConfig = guildConfigService.getConfig(guild.id);
    const welcomeConfig = this.getConfig(guild.id).welcome;

    // 1. Enregistrement Analytics Funnel (JOINED)
    welcomeRepository.recordEvent({
      type: 'MEMBER_JOIN',
      userId: member.id,
      userTag: member.user.tag,
      detail: `Arrivée du membre (Compte créé il y a ${this.getAccountAgeDays(member.user.createdAt)}j).`,
    });

    // 2. Attribution des Auto-Rôles
    if (welcomeConfig.autoRoleIds && welcomeConfig.autoRoleIds.length > 0) {
      await AutoRoleService.assignRoles(member, welcomeConfig.autoRoleIds);
    }

    // 3. Vérification des conditions d'éligibilité
    if (welcomeConfig.conditions?.enabled) {
      const accountAgeDays = this.getAccountAgeDays(member.user.createdAt);
      if (
        welcomeConfig.conditions.minAccountAgeDays &&
        accountAgeDays < welcomeConfig.conditions.minAccountAgeDays
      ) {
        logger.info(
          `[Welcome] Accueil ignoré pour ${member.user.tag} (compte trop récent: ${accountAgeDays}j < ${welcomeConfig.conditions.minAccountAgeDays}j).`
        );
        return;
      }
    }

    // 4. Lancement de l'Onboarding si actif
    await OnboardingService.startOnboarding(member);

    // 5. Si le module global ou le système welcome est inactif, on arrête ici
    if (!globalConfig.modules.welcome || !welcomeConfig.enabled) {
      return;
    }

    // Ignorer les bots si l'option est désactivée
    if (member.user.bot && !welcomeConfig.sendForBots) {
      return;
    }

    // 6. Contexte de variables partagé
    const ctx = this.buildVariableContext(member, null);

    // 7. Envoi du Welcome en DM si activé
    if (welcomeConfig.dm && welcomeConfig.dm.enabled) {
      await this.sendDmWelcome(member, welcomeConfig.dm, ctx);
    }

    // 8. Résolution du salon de bienvenue
    const channel = this.resolveChannel(guild, welcomeConfig.channelId);
    if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
      logger.warn(`[Welcome] Aucun salon valide trouvé ou permissions manquantes sur ${guild.name}.`);
      return;
    }

    // 9. Envoi dans le salon textuel
    ctx.channelId = channel.id;
    await this.sendMessage(channel, welcomeConfig, ctx, member.user.displayAvatarURL({ size: 256 }));

    // 10. Enregistrement Analytics & Audit Center
    welcomeRepository.recordEvent({
      type: 'WELCOME_SENT',
      userId: member.id,
      userTag: member.user.tag,
      detail: `Message de bienvenue envoyé dans #${channel.name}.`,
    });
  }

  // ==========================================
  // Traitement Départ d'un Membre
  // ==========================================
  public async handleMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
    const guild = member.guild;
    const globalConfig = guildConfigService.getConfig(guild.id);
    const goodbyeConfig = this.getConfig(guild.id).goodbye;

    welcomeRepository.recordEvent({
      type: 'MEMBER_LEAVE',
      userId: member.id,
      userTag: member.user?.tag || member.id,
      detail: 'Départ du membre du serveur.',
    });

    if (!globalConfig.modules.welcome || !goodbyeConfig.enabled) {
      return;
    }

    if (member.user?.bot && !goodbyeConfig.sendForBots) {
      return;
    }

    const channel = this.resolveChannel(guild, goodbyeConfig.channelId);
    if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
      return;
    }

    const username = member.user?.username || 'Membre';
    const ctx: VariableContext = {
      userId: member.id,
      username,
      displayName: 'displayName' in member && member.displayName ? member.displayName : username,
      userTag: member.user?.tag || username,
      mentionUser: false,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channel.id,
    };

    const avatarUrl = member.user?.displayAvatarURL({ size: 256 }) || guild.iconURL() || '';
    await this.sendMessage(channel, goodbyeConfig, ctx, avatarUrl);

    welcomeRepository.recordEvent({
      type: 'GOODBYE_SENT',
      userId: member.id,
      userTag: member.user?.tag || username,
      detail: `Message de départ envoyé dans #${channel.name}.`,
    });
  }

  // ==========================================
  // Envoi d'un message de test depuis le Dashboard
  // ==========================================
  public async sendTest(
    guild: Guild,
    type: 'welcome' | 'goodbye',
    target: 'channel' | 'dm' = 'channel',
    adminUser?: User
  ): Promise<{ success: boolean; channelName?: string; note?: string }> {
    const conf = this.getConfig(guild.id);
    const messageConf = type === 'welcome' ? conf.welcome : conf.goodbye;
    const clientMember = guild.members.me!;

    const ctx = this.buildVariableContext(clientMember, null);

    if (target === 'dm') {
      const recipient = adminUser || clientMember.user;
      try {
        await recipient.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10b981)
              .setTitle(`🧪 Test Welcome MP • ${guild.name}`)
              .setDescription(
                VariableParser.parse(
                  (messageConf as any).dm?.messageContent || messageConf.messageContent,
                  ctx
                )
              )
              .setFooter({ text: 'Mode Test ETHONE • Aucun membre n’a reçu ce message.' }),
          ],
        });
        return { success: true, note: 'Message de test envoyé en DM avec succès.' };
      } catch (err: any) {
        throw new Error(`Impossible d'envoyer le MP de test : ${err.message}`);
      }
    }

    const channel = this.resolveChannel(guild, messageConf.channelId);
    if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
      throw new Error('Salon textuel introuvable ou permissions d’envoi insuffisantes.');
    }

    ctx.channelId = channel.id;
    await this.sendMessage(channel, messageConf, ctx, clientMember.user.displayAvatarURL({ size: 256 }));
    return { success: true, channelName: channel.name };
  }

  // ==========================================
  // Envoi du Welcome en DM
  // ==========================================
  private async sendDmWelcome(
    member: GuildMember,
    dmConfig: any,
    ctx: VariableContext
  ): Promise<void> {
    try {
      const payload: any = {};
      if (dmConfig.messageContent) {
        payload.content = VariableParser.parse(dmConfig.messageContent, ctx);
      }

      if (dmConfig.embed && dmConfig.embed.enabled) {
        const embed = new EmbedBuilder()
          .setColor((dmConfig.embed.color || '#10B981') as `#${string}`)
          .setTitle(VariableParser.parse(dmConfig.embed.title, ctx))
          .setDescription(VariableParser.parse(dmConfig.embed.description, ctx));

        if (dmConfig.embed.authorName) {
          embed.setAuthor({
            name: VariableParser.parse(dmConfig.embed.authorName, ctx),
            iconURL: dmConfig.embed.authorIconUrl || member.guild.iconURL() || undefined,
          });
        }

        if (dmConfig.embed.footer) {
          embed.setFooter({
            text: VariableParser.parse(dmConfig.embed.footer, ctx),
            iconURL: dmConfig.embed.footerIconUrl || undefined,
          });
        }

        if (dmConfig.embed.showThumbnail) {
          embed.setThumbnail(dmConfig.embed.thumbnailUrl || member.guild.iconURL() || undefined);
        }

        if (dmConfig.embed.showTimestamp) {
          embed.setTimestamp();
        }

        payload.embeds = [embed];
      }

      if (dmConfig.buttons && dmConfig.buttons.length > 0) {
        const row = this.buildButtonsRow(dmConfig.buttons, member.guild.id);
        if (row.components.length > 0) {
          payload.components = [row];
        }
      }

      await member.send(payload);

      welcomeRepository.recordEvent({
        type: 'DM_SENT',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'Message privé de bienvenue délivré.',
      });
    } catch (err) {
      // Si les MP sont fermés, on log proprement sans planter
      welcomeRepository.recordEvent({
        type: 'DM_FAILED',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'DMs fermés ou bloqués par l’utilisateur.',
      });
    }
  }

  // ==========================================
  // Envoi effectif Discord (Message + Embed + Image + Boutons)
  // ==========================================
  private async sendMessage(
    channel: TextChannel,
    config: WelcomeMessageConfig | GoodbyeMessageConfig,
    ctx: VariableContext,
    avatarUrl: string
  ): Promise<void> {
    const files: AttachmentBuilder[] = [];

    // 1. Génération de l'image de carte si activée
    if (config.image && config.image.enabled) {
      try {
        const imageBuffer = await WelcomeCardGenerator.generateCard(config.image, avatarUrl, ctx);
        files.push(new AttachmentBuilder(imageBuffer, { name: 'card.png' }));
      } catch (err) {
        logger.error('[Welcome] Échec de la génération de la carte image :', err);
      }
    }

    const payload: {
      content?: string;
      embeds?: EmbedBuilder[];
      files?: AttachmentBuilder[];
      components?: ActionRowBuilder<ButtonBuilder>[];
    } = {};

    // 2. Contenu textuel
    if (config.messageContent) {
      payload.content = VariableParser.parse(config.messageContent, ctx);
    }

    // 3. Embed
    if (config.embed && config.embed.enabled) {
      const embed = new EmbedBuilder()
        .setColor((config.embed.color || '#10B981') as `#${string}`)
        .setTitle(VariableParser.parse(config.embed.title, ctx))
        .setDescription(VariableParser.parse(config.embed.description, ctx));

      if (config.embed.authorName) {
        embed.setAuthor({
          name: VariableParser.parse(config.embed.authorName, ctx),
          iconURL: config.embed.authorIconUrl || avatarUrl || undefined,
        });
      }

      if (config.embed.footer) {
        embed.setFooter({
          text: VariableParser.parse(config.embed.footer, ctx),
          iconURL: config.embed.footerIconUrl || channel.guild.iconURL() || undefined,
        });
      }

      if (config.embed.showThumbnail && avatarUrl) {
        embed.setThumbnail(config.embed.thumbnailUrl || avatarUrl);
      }

      if (config.embed.showTimestamp) {
        embed.setTimestamp();
      }

      // Champs personnalisés de l'embed
      if (config.embed.fields && config.embed.fields.length > 0) {
        for (const field of config.embed.fields.slice(0, 25)) {
          embed.addFields({
            name: VariableParser.parse(field.name, ctx),
            value: VariableParser.parse(field.value, ctx) || '\u200B',
            inline: field.inline ?? false,
          });
        }
      }

      if (files.length > 0) {
        embed.setImage('attachment://card.png');
      }

      payload.embeds = [embed];
    }

    if (files.length > 0) {
      payload.files = files;
    }

    // 4. Boutons interactifs
    if (config.buttons && config.buttons.length > 0) {
      const row = this.buildButtonsRow(config.buttons, channel.guild.id);
      if (row.components.length > 0) {
        payload.components = [row];
      }
    }

    await channel.send(payload);
  }

  // ==========================================
  // Construction de la ligne de boutons Discord
  // ==========================================
  private buildButtonsRow(
    buttons: WelcomeButtonConfig[],
    guildId: string
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (const btn of buttons.slice(0, 5)) {
      const builder = new ButtonBuilder().setLabel(btn.label || 'Action');

      if (btn.emoji) {
        try {
          builder.setEmoji(btn.emoji);
        } catch {}
      }

      if (btn.action === 'URL' && btn.target) {
        builder.setStyle(ButtonStyle.Link).setURL(btn.target);
      } else {
        builder.setStyle(this.resolveButtonStyle(btn.style));

        // Mapping Custom ID sécurisé
        if (btn.action === 'VERIFY') {
          builder.setCustomId(`welcome_verify:${guildId}`);
        } else if (btn.action === 'RULES') {
          builder.setCustomId(`welcome_rules:${guildId}`);
        } else if (btn.action === 'ROLE' && btn.target) {
          builder.setCustomId(`welcome_role:${btn.target}`);
        } else if (btn.action === 'TICKET') {
          builder.setCustomId(`ticket_open:${btn.target || 'support_general'}`);
        } else if (btn.action === 'CHANNEL' && btn.target) {
          builder.setCustomId(`welcome_channel:${btn.target}`);
        } else {
          builder.setCustomId(`welcome_action:${btn.id}`);
        }
      }

      row.addComponents(builder);
    }

    return row;
  }

  private resolveButtonStyle(style?: string): ButtonStyle {
    switch (style) {
      case 'SUCCESS':
        return ButtonStyle.Success;
      case 'DANGER':
        return ButtonStyle.Danger;
      case 'SECONDARY':
        return ButtonStyle.Secondary;
      case 'PRIMARY':
      default:
        return ButtonStyle.Primary;
    }
  }

  private resolveChannel(guild: Guild, channelId: string | null): TextChannel | null {
    if (channelId) {
      const found = guild.channels.cache.get(channelId);
      if (found && found.type === ChannelType.GuildText) {
        return found as TextChannel;
      }
    }

    if (guild.systemChannel && guild.systemChannel.type === ChannelType.GuildText) {
      return guild.systemChannel;
    }

    const fallback = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        (c.name.includes('bienvenue') ||
          c.name.includes('welcome') ||
          c.name.includes('general') ||
          c.name.includes('général'))
    );

    return (fallback as TextChannel) || null;
  }

  private buildVariableContext(member: GuildMember, channelId: string | null): VariableContext {
    const guild = member.guild;
    const owner = guild.members.cache.get(guild.ownerId);

    return {
      userId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      userTag: member.user.tag,
      mentionUser: true,
      userCreatedAt: member.user.createdAt,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channelId || undefined,
      serverOwner: owner?.user.tag || 'Propriétaire',
      accountAge: `${this.getAccountAgeDays(member.user.createdAt)} jours`,
    };
  }

  private getAccountAgeDays(createdAt: Date): number {
    const diffMs = Date.now() - createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

export const welcomeService = new WelcomeService();
