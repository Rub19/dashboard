import fs from 'fs';
import path from 'path';
import {
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  PartialGuildMember,
  TextChannel,
} from 'discord.js';
import {
  FullWelcomeConfig,
  FullWelcomeConfigSchema,
  GoodbyeMessageConfig,
  WelcomeMessageConfig,
} from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { VariableParser } from '../variables/variableParser.js';
import { WelcomeCardGenerator } from '../images/welcomeCardGenerator.js';
import { AutoRoleService } from './autoRoleService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';

class WelcomeService {
  private configFilePath = path.resolve(process.cwd(), 'data', 'welcome_configs.json');
  private configs = new Map<string, FullWelcomeConfig>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [guildId, val] of Object.entries(parsed)) {
          const res = FullWelcomeConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(guildId, res.data);
          }
        }
        logger.info(`Configurations Welcome & Goodbye chargées : ${this.configs.size} serveur(s).`);
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de welcome_configs.json :', err);
    }
  }

  private saveData() {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de welcome_configs.json :', err);
    }
  }

  public getConfig(guildId: string): FullWelcomeConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = FullWelcomeConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveData();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<FullWelcomeConfig>): FullWelcomeConfig {
    const current = this.getConfig(guildId);
    const merged = {
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
      },
    };

    const valid = FullWelcomeConfigSchema.parse(merged);
    this.configs.set(guildId, valid);
    this.saveData();
    return valid;
  }

  // ==========================================
  // Traitement Arrivée d'un Membre
  // ==========================================
  public async handleMemberAdd(member: GuildMember): Promise<void> {
    const guild = member.guild;
    const globalConfig = guildConfigService.getConfig(guild.id);
    const welcomeConfig = this.getConfig(guild.id).welcome;

    // 1. Attribution des Auto-Rôles
    if (welcomeConfig.autoRoleIds && welcomeConfig.autoRoleIds.length > 0) {
      await AutoRoleService.assignRoles(member, welcomeConfig.autoRoleIds);
    }

    // 2. Si le module global ou le système welcome est inactif, on arrête
    if (!globalConfig.modules.welcome || !welcomeConfig.enabled) {
      return;
    }

    // Ignorer les bots si l'option est désactivée
    if (member.user.bot && !welcomeConfig.sendForBots) {
      return;
    }

    // 3. Résolution du salon de bienvenue
    const channel = this.resolveChannel(guild, welcomeConfig.channelId);
    if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
      logger.warn(`[Welcome] Aucun salon valide trouvé ou permissions manquantes sur ${guild.name}.`);
      return;
    }

    // 4. Construction du contexte de variables
    const ctx: VariableContext = {
      userId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      userTag: member.user.tag,
      mentionUser: welcomeConfig.mentionUser,
      userCreatedAt: member.user.createdAt,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channel.id,
    };

    // 5. Envoi
    await this.sendMessage(channel, welcomeConfig, ctx, member.user.displayAvatarURL({ size: 256 }));
  }

  // ==========================================
  // Traitement Départ d'un Membre
  // ==========================================
  public async handleMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
    const guild = member.guild;
    const globalConfig = guildConfigService.getConfig(guild.id);
    const goodbyeConfig = this.getConfig(guild.id).goodbye;

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
      displayName: ('displayName' in member && member.displayName) ? member.displayName : username,
      userTag: member.user?.tag || username,
      mentionUser: false,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channel.id,
    };

    const avatarUrl = member.user?.displayAvatarURL({ size: 256 }) || guild.iconURL() || '';
    await this.sendMessage(channel, goodbyeConfig, ctx, avatarUrl);
  }

  // ==========================================
  // Envoi d'un message de test depuis le Dashboard
  // ==========================================
  public async sendTest(guild: Guild, type: 'welcome' | 'goodbye'): Promise<{ success: boolean; channelName: string }> {
    const conf = this.getConfig(guild.id);
    const messageConf = type === 'welcome' ? conf.welcome : conf.goodbye;

    const channel = this.resolveChannel(guild, messageConf.channelId);
    if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
      throw new Error('Salon introuvable ou permissions d’envoi manquantes.');
    }

    const clientMember = guild.members.me!;
    const ctx: VariableContext = {
      userId: clientMember.id,
      username: clientMember.user.username,
      displayName: clientMember.displayName,
      userTag: clientMember.user.tag,
      mentionUser: type === 'welcome' ? (messageConf as any).mentionUser ?? false : false,
      userCreatedAt: clientMember.user.createdAt,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channel.id,
    };

    await this.sendMessage(channel, messageConf, ctx, clientMember.user.displayAvatarURL({ size: 256 }));
    return { success: true, channelName: channel.name };
  }

  // ==========================================
  // Envoi effectif Discord (Message + Embed + Image)
  // ==========================================
  private async sendMessage(
    channel: TextChannel,
    config: WelcomeMessageConfig | GoodbyeMessageConfig,
    ctx: VariableContext,
    avatarUrl: string
  ): Promise<void> {
    const files: AttachmentBuilder[] = [];

    // 1. Génération de la carte d'image si activée
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
    } = {};

    // 2. Contenu textuel
    if (config.messageContent) {
      payload.content = VariableParser.parse(config.messageContent, ctx);
    }

    // 3. Embed
    if (config.embed && config.embed.enabled) {
      const embed = new EmbedBuilder()
        .setColor((config.embed.color || '#5865F2') as `#${string}`)
        .setTitle(VariableParser.parse(config.embed.title, ctx))
        .setDescription(VariableParser.parse(config.embed.description, ctx));

      if (config.embed.authorName) {
        embed.setAuthor({
          name: VariableParser.parse(config.embed.authorName, ctx),
          iconURL: avatarUrl || undefined,
        });
      }

      if (config.embed.footer) {
        embed.setFooter({
          text: VariableParser.parse(config.embed.footer, ctx),
          iconURL: channel.guild.iconURL() || undefined,
        });
      }

      if (config.embed.showThumbnail && avatarUrl) {
        embed.setThumbnail(avatarUrl);
      }

      if (config.embed.showTimestamp) {
        embed.setTimestamp();
      }

      // Si l'image de carte est activée, on peut l'attacher à l'embed
      if (files.length > 0) {
        embed.setImage('attachment://card.png');
      }

      payload.embeds = [embed];
    }

    if (files.length > 0) {
      payload.files = files;
    }

    await channel.send(payload);
  }

  private resolveChannel(guild: Guild, channelId: string | null): TextChannel | null {
    if (channelId) {
      const found = guild.channels.cache.get(channelId);
      if (found && found.type === ChannelType.GuildText) {
        return found as TextChannel;
      }
    }

    // Fallbacks
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
}

export const welcomeService = new WelcomeService();
