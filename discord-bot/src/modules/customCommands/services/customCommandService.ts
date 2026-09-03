import {
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  Message,
  PermissionResolvable,
} from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { customCommandStorage } from '../storage/customCommandStorage.js';
import { CommandVariableEngine, VariableContext } from './commandVariableEngine.js';
import { CommandConditionEngine } from './commandConditionEngine.js';
import { CommandActionExecutor } from './commandActionExecutor.js';
import { logger } from '../../../utils/logger.js';

// Per-user cooldown cache: key = `${commandId}:${userId}`
const cooldownCache = new Map<string, number>();

const PERMISSION_MAP: Record<string, PermissionResolvable> = {
  ManageGuild: 'ManageGuild',
  ManageMessages: 'ManageMessages',
  ManageRoles: 'ManageRoles',
  BanMembers: 'BanMembers',
  KickMembers: 'KickMembers',
  Administrator: 'Administrator',
};

export class CustomCommandService {
  /**
   * Handle a slash command interaction for a custom command
   */
  public static async executeSlash(
    cmd: CustomCommand,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    if (!interaction.guildId || !interaction.guild || !interaction.member) return;

    const member = interaction.member as GuildMember;

    // Permission check
    const permError = this.checkPermissions(cmd, member);
    if (permError) {
      await interaction.reply({ content: permError, ephemeral: true });
      return;
    }

    // Cooldown check
    const cdError = this.checkCooldown(cmd, interaction.user.id);
    if (cdError) {
      await interaction.reply({ content: cdError, ephemeral: true });
      return;
    }

    // Resolve args
    const args: Record<string, any> = {};
    for (const arg of cmd.arguments) {
      const optionValue = interaction.options.get(arg.name.toLowerCase())?.value;
      if (optionValue !== undefined) {
        args[arg.name] = optionValue;
      }
    }

    const ctx: VariableContext = {
      guild: interaction.guild,
      member,
      channel: interaction.channel as any,
      args,
    };

    let replied = false;
    const replyFn = async (payload: any) => {
      if (!replied) {
        await interaction.reply({ ...payload, ephemeral: false }).catch(() => null);
        replied = true;
      } else {
        await interaction.followUp(payload).catch(() => null);
      }
    };

    await this.run(cmd, ctx, member, null, replyFn);

    if (!replied) {
      await interaction
        .reply({ content: '✅ Commande exécutée.', ephemeral: true })
        .catch(() => null);
    }

    customCommandStorage.incrementUsage(cmd.id);
  }

  /**
   * Handle a prefix (message) trigger
   */
  public static async executePrefix(
    cmd: CustomCommand,
    message: Message,
    rawArgs: string[]
  ): Promise<void> {
    if (!message.guild || !message.member) return;

    const member = message.member;

    const permError = this.checkPermissions(cmd, member);
    if (permError) {
      await message.reply(permError).catch(() => null);
      return;
    }

    const cdError = this.checkCooldown(cmd, message.author.id);
    if (cdError) {
      await message.reply(cdError).catch(() => null);
      return;
    }

    // Map args positionally
    const args: Record<string, any> = {};
    cmd.arguments.forEach((arg, i) => {
      if (rawArgs[i] !== undefined) {
        args[arg.name] = rawArgs[i];
      }
    });

    const ctx: VariableContext = {
      guild: message.guild,
      member,
      channel: message.channel as any,
      args,
    };

    const replyFn = async (payload: any) => {
      const ch = message.channel as import('discord.js').TextChannel;
      await ch.send(payload).catch(() => null);
    };

    await this.run(cmd, ctx, member, message, replyFn);
    customCommandStorage.incrementUsage(cmd.id);
  }

  private static async run(
    cmd: CustomCommand,
    ctx: VariableContext,
    member: GuildMember,
    message: Message | null,
    replyFn: (payload: any) => Promise<void>
  ) {
    try {
      // Evaluate conditions
      for (const block of cmd.conditions) {
        const result = CommandConditionEngine.evaluate(
          block.condition,
          member,
          ctx.channel?.id,
          ctx.args
        );

        if (result) {
          await CommandActionExecutor.executeActions(
            block.thenActions,
            ctx,
            member,
            message,
            replyFn
          );
        } else if (block.elseActions?.length) {
          await CommandActionExecutor.executeActions(
            block.elseActions,
            ctx,
            member,
            message,
            replyFn
          );
        }
      }

      // Default actions (always)
      if (cmd.defaultActions.length) {
        await CommandActionExecutor.executeActions(
          cmd.defaultActions,
          ctx,
          member,
          message,
          replyFn
        );
      }
    } catch (err) {
      logger.error(`[CustomCommand] Erreur exécution "${cmd.name}":`, err);
    }
  }

  private static checkPermissions(cmd: CustomCommand, member: GuildMember): string | null {
    if (cmd.requiredRoleIds.length > 0) {
      const hasRole = cmd.requiredRoleIds.some((id) => member.roles.cache.has(id));
      if (!hasRole) {
        return '❌ Vous n\'avez pas le rôle requis pour utiliser cette commande.';
      }
    }

    if (cmd.requiredPermission && PERMISSION_MAP[cmd.requiredPermission]) {
      if (!member.permissions.has(PERMISSION_MAP[cmd.requiredPermission])) {
        return `❌ Permission requise : \`${cmd.requiredPermission}\``;
      }
    }

    return null;
  }

  private static checkCooldown(cmd: CustomCommand, userId: string): string | null {
    if (!cmd.cooldownSeconds) return null;

    const key = `${cmd.id}:${userId}`;
    const now = Date.now();
    const last = cooldownCache.get(key);

    if (last) {
      const remaining = cmd.cooldownSeconds * 1000 - (now - last);
      if (remaining > 0) {
        return `⏱️ Veuillez attendre encore **${Math.ceil(remaining / 1000)} seconde(s)** avant de réutiliser cette commande.`;
      }
    }

    cooldownCache.set(key, now);
    // Auto-clean after cooldown
    setTimeout(() => cooldownCache.delete(key), cmd.cooldownSeconds * 1000 + 1000).unref();
    return null;
  }
}
