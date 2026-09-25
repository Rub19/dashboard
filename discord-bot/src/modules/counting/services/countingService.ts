import { Message } from 'discord.js';
import { countingStorage } from '../storage/countingStorage.js';
import { CountingConfig } from '../types/counting.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

/** Un message compte s'il COMMENCE par un nombre entier (« 12 », « 12 bravo ») ; le reste du salon est ignoré. */
const NUMBER_AT_START = /^\s*(\d{1,15})(?!\d)/;
const MAX_CONTRIBUTORS = 500;

export type CountingVerdict =
  | { kind: 'ignored' }
  | { kind: 'ok'; expected: number; record: boolean }
  | { kind: 'mistake'; expected: number; given: number; reason: 'wrong-number' | 'consecutive'; reset: boolean; previousCount: number };

class CountingService {
  /**
   * Logique pure et synchrone (aucun `await` entre la lecture et l'écriture de l'état : deux messages presque simultanés
   * sont traités l'un après l'autre, jamais en parallèle).
   */
  public evaluate(guildId: string, channelId: string, userId: string, content: string): CountingVerdict {
    const conf = countingStorage.getConfig(guildId);
    if (!conf.enabled || !conf.channelId || conf.channelId !== channelId) return { kind: 'ignored' };
    const match = NUMBER_AT_START.exec(content);
    if (!match) return { kind: 'ignored' };

    const given = Number(match[1]);
    const expected = conf.count + 1;
    const consecutive = !conf.allowConsecutive && conf.lastUserId === userId && conf.count > 0;
    const contributors = { ...conf.contributors };
    const mine = contributors[userId] ?? { correct: 0, mistakes: 0 };

    if (given === expected && !consecutive) {
      const record = expected > conf.highScore;
      contributors[userId] = { correct: mine.correct + 1, mistakes: mine.mistakes };
      countingStorage.updateConfig(guildId, {
        count: expected,
        lastUserId: userId,
        highScore: Math.max(conf.highScore, expected),
        totalCorrect: conf.totalCorrect + 1,
        contributors: this.trim(contributors),
      });
      return { kind: 'ok', expected, record };
    }

    contributors[userId] = { correct: mine.correct, mistakes: mine.mistakes + 1 };
    const reason = given === expected ? 'consecutive' : 'wrong-number';
    countingStorage.updateConfig(guildId, {
      ...(conf.resetOnMistake ? { count: 0, lastUserId: null, lastResetAt: new Date().toISOString() } : {}),
      totalMistakes: conf.totalMistakes + 1,
      contributors: this.trim(contributors),
    });
    return { kind: 'mistake', expected, given, reason, reset: conf.resetOnMistake, previousCount: conf.count };
  }

  /** Garde les statistiques des plus actifs : le fichier ne grossit pas indéfiniment. */
  private trim(contributors: CountingConfig['contributors']): CountingConfig['contributors'] {
    const entries = Object.entries(contributors);
    if (entries.length <= MAX_CONTRIBUTORS) return contributors;
    entries.sort((a, b) => b[1].correct - a[1].correct);
    return Object.fromEntries(entries.slice(0, MAX_CONTRIBUTORS));
  }

  public async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || !message.content) return;
    const verdict = this.evaluate(message.guild.id, message.channelId, message.author.id, message.content);
    if (verdict.kind === 'ignored') return;

    try {
      if (verdict.kind === 'ok') {
        await message.react(verdict.record ? '🏆' : '✅');
        return;
      }
      await message.react('❌');
      const why =
        verdict.reason === 'consecutive'
          ? `Tu ne peux pas compter deux fois de suite, ${message.author}.`
          : `${message.author} a écrit **${verdict.given}** au lieu de **${verdict.expected}**.`;
      const embed = baseEmbed('error')
        .setTitle(verdict.reset ? '💥 Compteur remis à zéro' : '❌ Mauvais nombre')
        .setDescription(
          verdict.reset
            ? `${why}\nOn était à **${verdict.previousCount}**. Recommencez à **1** !`
            : `${why}\nLe prochain nombre est **${verdict.expected}**.`
        );
      if ('send' in message.channel) await message.channel.send({ embeds: [embed], allowedMentions: { users: [message.author.id] } });
    } catch (err) {
      logger.warn('[Comptage] Réaction ou réponse impossible (permissions du salon ?) :', err);
    }
  }
}

export const countingService = new CountingService();
