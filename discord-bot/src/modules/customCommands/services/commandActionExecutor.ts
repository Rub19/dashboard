import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  Message,
  TextChannel,
} from 'discord.js';
import { CommandAction, CommandResponseBlock } from '../types/customCommand.js';
import { CommandVariableEngine, VariableContext } from './commandVariableEngine.js';
import { logger } from '../../../utils/logger.js';

export class CommandActionExecutor {
  public static buildReply(
    response: CommandResponseBlock,
    ctx: VariableContext
  ): { content?: string; embeds?: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } {
    const result: { content?: string; embeds?: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } = {};

    if (response.content) {
      result.content = CommandVariableEngine.replace(response.content, ctx);
    }

    if (response.embed) {
      const e = response.embed;
      const embed = new EmbedBuilder()
        .setColor((e.color || '#6366F1') as `#${string}`);

      if (e.title) embed.setTitle(CommandVariableEngine.replace(e.title, ctx));
      if (e.description) embed.setDescription(CommandVariableEngine.replace(e.description, ctx));
      if (e.thumbnailUrl) embed.setThumbnail(e.thumbnailUrl);
      if (e.imageUrl) embed.setImage(e.imageUrl);
      if (e.footerText) embed.setFooter({ text: CommandVariableEngine.replace(e.footerText, ctx) });
      if (e.fields?.length) {
        embed.addFields(
          e.fields.map((f) => ({
            name: CommandVariableEngine.replace(f.name, ctx),
            value: CommandVariableEngine.replace(f.value, ctx),
            inline: f.inline,
          }))
        );
      }

      result.embeds = [embed];
    }

    if (response.buttons?.length) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const btn of response.buttons.slice(0, 5)) {
        if (btn.style === 'link' && btn.url) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(btn.label)
              .setURL(btn.url)
              .setStyle(ButtonStyle.Link)
          );
        }
      }
      if (row.components.length) {
        result.components = [row];
      }
    }

    return result;
  }

  public static async executeActions(
    actions: CommandAction[],
    ctx: VariableContext,
    member: GuildMember,
    message: Message | null,
    replyFn: (payload: any) => Promise<void>
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_response':
            if (action.response) {
              const payload = this.buildReply(action.response, ctx);
              await replyFn(payload);
            }
            break;

          case 'add_role': {
            if (!action.roleId) break;
            const role = member.guild.roles.cache.get(action.roleId);
            const botMember = member.guild.members.me;
            if (role && botMember && botMember.roles.highest.comparePositionTo(role) > 0) {
              await member.roles.add(role).catch(() => null);
            }
            break;
          }

          case 'remove_role': {
            if (!action.roleId) break;
            const role = member.guild.roles.cache.get(action.roleId);
            const botMember2 = member.guild.members.me;
            if (role && botMember2 && botMember2.roles.highest.comparePositionTo(role) > 0) {
              await member.roles.remove(role).catch(() => null);
            }
            break;
          }

          case 'delete_trigger':
            if (message?.deletable) {
              await message.delete().catch(() => null);
            }
            break;

          case 'send_dm':
            if (action.response) {
              const payload = this.buildReply(action.response, ctx);
              await member.send(payload).catch(() => null);
            }
            break;
        }
      } catch (err) {
        logger.error(`[CustomCommand] Erreur action ${action.type}:`, err);
      }
    }
  }
}
