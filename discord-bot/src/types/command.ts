import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  MessageReplyOptions,
  PermissionsBitField,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  TextBasedChannel,
  User,
} from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { GuildConfig, resolveHexColor } from './guildConfig.js';

export type UnifiedReplyOptions =
  | string
  | MessagePayload
  | (Omit<InteractionReplyOptions, 'flags'> &
      Omit<InteractionEditReplyOptions, 'flags'> &
      Omit<MessageReplyOptions, 'flags'> & {
        ephemeral?: boolean;
      });

export class CommandContext {
  public readonly isSlash: boolean;
  public readonly client: Client;
  public readonly author: User;
  public readonly member: GuildMember | null;
  public readonly guild: Guild | null;
  public readonly channel: TextBasedChannel | null;
  public readonly prefix: string;
  public readonly args: string[];
  public readonly guildConfig: GuildConfig;
  public readonly interaction?: ChatInputCommandInteraction;
  public readonly message?: Message;
  private deferred = false;
  private repliedMessage?: Message;

  constructor(options: {
    interaction?: ChatInputCommandInteraction;
    message?: Message;
    args?: string[];
    prefix?: string;
    guildConfig?: GuildConfig;
  }) {
    const guildId = options.interaction?.guildId ?? options.message?.guildId ?? null;
    this.guildConfig = options.guildConfig ?? guildConfigService.getConfig(guildId);
    this.prefix = options.prefix ?? this.guildConfig.prefix;

    if (options.interaction) {
      this.isSlash = true;
      this.interaction = options.interaction;
      this.client = options.interaction.client;
      this.author = options.interaction.user;
      this.member = options.interaction.member as GuildMember | null;
      this.guild = options.interaction.guild;
      this.channel = options.interaction.channel;
      this.args = [];
    } else if (options.message) {
      this.isSlash = false;
      this.message = options.message;
      this.client = options.message.client;
      this.author = options.message.author;
      this.member = options.message.member;
      this.guild = options.message.guild;
      this.channel = options.message.channel;
      this.args = options.args ?? [];
    } else {
      throw new Error('CommandContext requiert soit une interaction, soit un message.');
    }
  }

  public get user(): User {
    return this.author;
  }

  public get guildId(): string | null {
    return this.guild?.id ?? this.interaction?.guildId ?? this.message?.guildId ?? null;
  }

  public get channelId(): string | null {
    return this.channel?.id ?? this.interaction?.channelId ?? this.message?.channelId ?? null;
  }

  public get options() {
    if (this.interaction) {
      return this.interaction.options;
    }
    return {
      getString: (name: string, required = false) => this.args[0] ?? null,
      getInteger: (name: string, required = false) => {
        const val = parseInt(this.args[0] ?? '', 10);
        return isNaN(val) ? null : val;
      },
      getBoolean: (name: string, required = false) => null,
      getUser: (name: string, required = false) => null,
      getMember: (name: string, required = false) => null,
      getChannel: (name: string, required = false) => null,
      getRole: (name: string, required = false) => null,
    } as any;
  }

  /**
   * Crée un EmbedBuilder pré-configuré avec les couleurs et le nom personnalisé du serveur
   */
  public createEmbed(type: 'default' | 'secondary' | 'success' | 'error' | 'info' = 'default'): EmbedBuilder {
    let hexColor: string;
    switch (type) {
      case 'secondary':
        hexColor = this.guildConfig.secondaryColor;
        break;
      case 'success':
        hexColor = this.guildConfig.successColor;
        break;
      case 'error':
        hexColor = this.guildConfig.errorColor;
        break;
      case 'info':
        hexColor = this.guildConfig.infoColor;
        break;
      case 'default':
      default:
        hexColor = this.guildConfig.primaryColor;
        break;
    }

    return new EmbedBuilder()
      .setColor(resolveHexColor(hexColor))
      .setFooter({
        text: `${this.guildConfig.botName} • Demandé par ${this.author.username}`,
        iconURL: this.author.displayAvatarURL(),
      })
      .setTimestamp();
  }

  /**
   * Diffère la réponse (utile si le traitement prend plus de 3 secondes)
   */
  public async deferReply(options?: boolean | { ephemeral?: boolean }): Promise<void> {
    if (this.deferred) return;
    this.deferred = true;

    const ephemeral = typeof options === 'boolean' ? options : (options?.ephemeral ?? false);

    if (this.isSlash && this.interaction) {
      await this.interaction.deferReply({ ephemeral });
    } else if (this.message && this.channel && 'sendTyping' in this.channel) {
      await this.channel.sendTyping();
    }
  }

  /**
   * Répond à la commande (Slash ou Message)
   */
  public async reply(content: UnifiedReplyOptions): Promise<void> {
    if (this.isSlash && this.interaction) {
      if (this.interaction.deferred || this.interaction.replied) {
        await this.interaction.editReply(content as string | MessagePayload | InteractionEditReplyOptions);
      } else {
        await this.interaction.reply(content as InteractionReplyOptions);
      }
    } else if (this.message) {
      if (this.repliedMessage) {
        await this.repliedMessage.edit(content as string | MessagePayload);
      } else {
        this.repliedMessage = await this.message.reply(content as string | MessagePayload | MessageReplyOptions);
      }
    }
  }

  /**
   * Modifie la réponse existante
   */
  public async editReply(content: UnifiedReplyOptions): Promise<void> {
    if (this.isSlash && this.interaction) {
      await this.interaction.editReply(content as string | MessagePayload | InteractionEditReplyOptions);
    } else if (this.repliedMessage) {
      await this.repliedMessage.edit(content as string | MessagePayload);
    } else if (this.message) {
      this.repliedMessage = await this.message.reply(content as string | MessagePayload | MessageReplyOptions);
    }
  }

  /**
   * Récupère un argument de type string (par nom pour slash, ou par index 0-based pour préfixe)
   */
  public getString(name: string, index = 0): string | null {
    if (this.isSlash && this.interaction) {
      return this.interaction.options.getString(name);
    }
    return this.args[index] ?? null;
  }

  /**
   * Récupère le reste des arguments textuels à partir d'un index
   */
  public getRemainingString(index = 0): string | null {
    if (this.isSlash && this.interaction) {
      return this.interaction.options.getString('text') ?? null;
    }
    const joined = this.args.slice(index).join(' ');
    return joined.length > 0 ? joined : null;
  }
}

export interface Command {
  name: string;
  description: string;
  category?: string;
  aliases?: string[];
  userPermissions?: bigint[];
  botPermissions?: bigint[];
  slashData?:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (ctx: CommandContext) => Promise<void>;
}
