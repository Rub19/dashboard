import { Message } from 'discord.js';
import { CustomRule, RuleCondition } from '../types/autoMod.js';
import { autoModRepository } from '../storage/autoModRepository.js';

export interface RuleEvaluationContext {
  message: Message;
  currentRiskScore: number;
  userStrikesCount: number;
  raidModeActive: boolean;
}

export class RuleEngine {
  public static evaluateRules(
    context: RuleEvaluationContext,
    customRules: CustomRule[]
  ): Array<{ rule: CustomRule; reason: string }> {
    const matched: Array<{ rule: CustomRule; reason: string }> = [];
    const { message } = context;

    // Trier les règles par priorité descendante
    const sorted = [...customRules].sort((a, b) => (b.priority || 1) - (a.priority || 1));

    for (const rule of sorted) {
      if (!rule.enabled) continue;

      // 1. Vérifier exemptions de salon
      if (rule.exemptChannelIds.includes(message.channel.id)) continue;

      // 2. Vérifier exemptions de rôle
      if (
        message.member &&
        rule.exemptRoleIds.some((r) => message.member!.roles.cache.has(r))
      ) {
        continue;
      }

      // 3. Vérifier cibles salon si spécifiées
      if (rule.targetChannelIds.length > 0 && !rule.targetChannelIds.includes(message.channel.id)) {
        continue;
      }

      // 4. Vérifier cibles rôle si spécifiées
      if (
        rule.targetRoleIds.length > 0 &&
        (!message.member || !rule.targetRoleIds.some((r) => message.member!.roles.cache.has(r)))
      ) {
        continue;
      }

      // 5. Évaluer les conditions
      if (rule.conditions.length === 0) continue;

      const conditionResults = rule.conditions.map((cond) => this.evaluateCondition(cond, context));

      let isTriggered = false;
      if (rule.conditionOperator === 'ALL') {
        isTriggered = conditionResults.every((r) => r);
      } else if (rule.conditionOperator === 'ANY') {
        isTriggered = conditionResults.some((r) => r);
      } else if (rule.conditionOperator === 'NOT') {
        isTriggered = conditionResults.every((r) => !r);
      }

      if (isTriggered) {
        matched.push({
          rule,
          reason: `Règle personnalisée déclenchée : "${rule.name}"`,
        });
      }
    }

    return matched;
  }

  private static evaluateCondition(cond: RuleCondition, ctx: RuleEvaluationContext): boolean {
    const content = ctx.message.content || '';
    const lowerContent = content.toLowerCase();

    switch (cond.type) {
      case 'CONTAINS_WORD': {
        const word = String(cond.value).toLowerCase();
        return lowerContent.includes(word);
      }

      case 'CONTAINS_LINK': {
        const hasLink = /(https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi.test(content);
        return Boolean(cond.value) === hasLink;
      }

      case 'CONTAINS_INVITE': {
        const hasInvite = /(discord\.(gg|io|me)|discordapp\.com\/invite|discord\.com\/invite)\//i.test(content);
        return Boolean(cond.value) === hasInvite;
      }

      case 'STARTS_WITH': {
        return lowerContent.startsWith(String(cond.value).toLowerCase());
      }

      case 'LENGTH_GREATER_THAN': {
        return content.length > Number(cond.value);
      }

      case 'CAPS_PERCENTAGE_GREATER_THAN': {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length < 5) return false;
        const upper = (letters.match(/[A-Z]/g) || []).length;
        const pct = (upper / letters.length) * 100;
        return pct > Number(cond.value);
      }

      case 'MENTIONS_GREATER_THAN': {
        const count = ctx.message.mentions.users.size + ctx.message.mentions.roles.size;
        return count > Number(cond.value);
      }

      case 'USER_ACCOUNT_AGE_HOURS_LESS_THAN': {
        const ageHours = (Date.now() - ctx.message.author.createdAt.getTime()) / (1000 * 60 * 60);
        return ageHours < Number(cond.value);
      }

      case 'USER_HAS_ROLE': {
        return Boolean(ctx.message.member?.roles.cache.has(String(cond.value)));
      }

      case 'CHANNEL_IS': {
        return ctx.message.channel.id === String(cond.value);
      }

      case 'USER_STRIKES_GREATER_THAN': {
        return ctx.userStrikesCount > Number(cond.value);
      }

      case 'RISK_SCORE_GREATER_THAN': {
        return ctx.currentRiskScore > Number(cond.value);
      }

      case 'RAID_MODE_ACTIVE': {
        return Boolean(cond.value) === ctx.raidModeActive;
      }

      default:
        return false;
    }
  }
}
