import { Colors, EmbedBuilder, Guild, GuildMember, Message, TextChannel } from 'discord.js';
import { AutoModAction, AutoModConfig } from '../types/autoMod.js';
import { StrikeService } from './strikeService.js';
import { raidActionService } from '../../antiRaid/services/raidActionService.js';
import { logger } from '../../../utils/logger.js';

export interface ActionExecutionContext {
  message: Message;
  member: GuildMember;
  actions: AutoModAction[];
  reason: string;
  config: AutoModConfig;
  customTimeoutSeconds?: number;
  addStrikesCount?: number;
}

export class ActionEngine {
  public static async executeActions(context: ActionExecutionContext): Promise<{
    executed: AutoModAction[];
    newStrikesCount: number;
  }> {
    const { message, member, actions, reason, config, customTimeoutSeconds, addStrikesCount } = context;
    const guild = message.guild!;
    const executed: AutoModAction[] = [];
    const uniqueActions = Array.from(new Set(actions));

    // 1. DELETE
    if (uniqueActions.includes('DELETE') && message.deletable) {
      try {
        await message.delete();
        executed.push('DELETE');
      } catch (err) {
        logger.error('[ActionEngine] Échec suppression message :', err);
      }
    }

    // 2. STRIKE
    let activeStrikesCount = StrikeService.getActiveStrikes(guild.id, member.id).length;
    if (uniqueActions.includes('STRIKE')) {
      const countToAdd = addStrikesCount || 1;
      for (let i = 0; i < countToAdd; i++) {
        StrikeService.addStrike(guild.id, member.id, reason, 'AUTOMOD', config.strikes.expirationDays);
      }
      activeStrikesCount += countToAdd;
      executed.push('STRIKE');

      // Évaluer sanctions progressives après ajout de strike
      const progressive = StrikeService.evaluateProgressiveSanction(config.strikes, activeStrikesCount);
      if (progressive && !uniqueActions.includes(progressive.action)) {
        uniqueActions.push(progressive.action);
      }
    }

    // 3. WARN
    if (uniqueActions.includes('WARN')) {
      try {
        const warnEmbed = new EmbedBuilder()
          .setColor(Colors.Orange)
          .setTitle('⚠️ Avertissement AutoMod')
          .setDescription(`Votre message sur **${guild.name}** a enfreint les règles du serveur.\n**Motif :** ${reason}`)
          .setFooter({ text: `Strikes actifs : ${activeStrikesCount}` })
          .setTimestamp();

        // Tenter en MP, sinon message éphémère dans le salon
        await member.send({ embeds: [warnEmbed] }).catch(async () => {
          if (message.channel && 'send' in message.channel) {
            const temp = await (message.channel as TextChannel).send({
              content: `<@${member.id}>`,
              embeds: [warnEmbed],
            });
            setTimeout(() => temp.delete().catch(() => {}), 8000);
          }
        });
        executed.push('WARN');
      } catch {}
    }

    // 4. TIMEOUT
    if (uniqueActions.includes('TIMEOUT') && member.moderatable) {
      const duration = (customTimeoutSeconds || 300) * 1000;
      try {
        await member.timeout(duration, `[AutoMod] ${reason}`);
        executed.push('TIMEOUT');
      } catch (err) {
        logger.error('[ActionEngine] Échec timeout :', err);
      }
    }

    // 5. QUARANTINE
    if (uniqueActions.includes('QUARANTINE')) {
      try {
        await raidActionService.executeMemberAction(member, 'QUARANTINE', `[AutoMod] ${reason}`);
        executed.push('QUARANTINE');
      } catch {}
    }

    // 6. KICK
    if (uniqueActions.includes('KICK') && member.kickable) {
      try {
        await member.kick(`[AutoMod] ${reason}`);
        executed.push('KICK');
      } catch (err) {
        logger.error('[ActionEngine] Échec kick :', err);
      }
    }

    // 7. BAN
    if (uniqueActions.includes('BAN') && member.bannable) {
      try {
        await member.ban({ deleteMessageSeconds: 3600, reason: `[AutoMod] ${reason}` });
        executed.push('BAN');
      } catch (err) {
        logger.error('[ActionEngine] Échec ban :', err);
      }
    }

    // 8. LOCK CHANNEL
    if (uniqueActions.includes('LOCK_CHANNEL')) {
      try {
        if (message.channel && 'permissionOverwrites' in message.channel) {
          const textChannel = message.channel as TextChannel;
          await textChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
          executed.push('LOCK_CHANNEL');
        }
      } catch {}
    }

    return { executed, newStrikesCount: activeStrikesCount };
  }
}
