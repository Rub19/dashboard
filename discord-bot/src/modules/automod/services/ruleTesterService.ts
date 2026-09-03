import { autoModRepository } from '../storage/autoModRepository.js';
import { AutoModAction, RuleTestInput, RuleTestOutput } from '../types/autoMod.js';
import { SpamDetector } from '../detectors/spamDetector.js';
import { FloodDetector } from '../detectors/floodDetector.js';
import { LinkDetector } from '../detectors/linkDetector.js';
import { InviteDetector } from '../detectors/inviteDetector.js';
import { MentionDetector } from '../detectors/mentionDetector.js';
import { CapsDetector } from '../detectors/capsDetector.js';
import { KeywordDetector } from '../detectors/keywordDetector.js';
import { RegexDetector } from '../detectors/regexDetector.js';
import { AutoModRiskEngine } from './autoModRiskEngine.js';

export class RuleTesterService {
  public static testMessage(input: RuleTestInput): RuleTestOutput {
    const { guildId, messageContent } = input;
    const config = autoModRepository.getConfig(guildId);
    const customRules = autoModRepository.getRules(guildId);

    // Mock minimal discord.js message structure for testing
    const mockMessage: any = {
      guildId,
      content: messageContent,
      author: {
        id: input.userId || 'test-user-id',
        tag: 'Tester#0001',
        createdAt: new Date(),
        bot: false,
      },
      channel: {
        id: input.channelId || 'test-channel-id',
      },
      mentions: {
        users: new Map(),
        roles: new Map(),
        everyone: /@(everyone|here)/i.test(messageContent),
      },
    };

    const results = [
      FloodDetector.check(mockMessage, config),
      LinkDetector.check(mockMessage, config),
      InviteDetector.check(mockMessage, config),
      MentionDetector.check(mockMessage, config),
      CapsDetector.check(mockMessage, config),
      KeywordDetector.check(mockMessage, config),
      RegexDetector.check(mockMessage, config),
    ];

    const matchedDetectors: string[] = [];
    const explanations: string[] = [];
    const proposedActions = new Set<AutoModAction>();

    for (const r of results) {
      if (r.triggered) {
        matchedDetectors.push(r.detectorName);
        explanations.push(`${r.detectorName} : ${r.reason}`);
        r.actions.forEach((a) => proposedActions.add(a));
      }
    }

    // Tester les règles personnalisées
    const matchedCustomRules: string[] = [];
    let wouldAddStrikes = 0;

    for (const rule of customRules) {
      if (!rule.enabled) continue;
      let matched = false;

      // Condition simplifiée pour le test
      for (const cond of rule.conditions) {
        if (cond.type === 'CONTAINS_WORD' && messageContent.toLowerCase().includes(String(cond.value).toLowerCase())) {
          matched = true;
        }
        if (cond.type === 'CONTAINS_LINK' && /https?:\/\//i.test(messageContent)) {
          matched = true;
        }
        if (cond.type === 'CONTAINS_INVITE' && /discord\.gg/i.test(messageContent)) {
          matched = true;
        }
      }

      if (matched) {
        matchedCustomRules.push(rule.name);
        explanations.push(`Règle personnalisée "${rule.name}" déclenchée`);
        rule.actions.forEach((a) => proposedActions.add(a));
        wouldAddStrikes += rule.addStrikesCount || 1;
      }
    }

    const { totalScore, riskLevel } = AutoModRiskEngine.calculateTotalRisk(results);

    return {
      matchedDetectors,
      matchedCustomRules,
      totalRiskScore: totalScore,
      riskLevel,
      actionsToExecute: Array.from(proposedActions),
      wouldAddStrikes,
      explanation: explanations,
    };
  }
}
