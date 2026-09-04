import {
  DiscordPoll,
  PollResultsSummary,
  PollQuestionResult,
  PollOptionResult,
} from '../types/index.js';
import { pollRepository } from '../storage/pollRepository.js';

export class PollResultService {
  /**
   * Compute complete results, percentages, rankings, quorum status, and winning options.
   */
  public calculateResults(
    pollOrGuildId: DiscordPoll | string,
    pollIdOrMemberCount?: string | number,
    serverMemberCountParam = 150
  ): any {
    let poll: DiscordPoll | undefined;
    let serverMemberCount = serverMemberCountParam;

    if (typeof pollOrGuildId === 'string') {
      const guildId = pollOrGuildId;
      const pollId = typeof pollIdOrMemberCount === 'string' ? pollIdOrMemberCount : '';
      poll = pollRepository.getPollById(guildId, pollId);
      serverMemberCount = typeof pollIdOrMemberCount === 'number' ? pollIdOrMemberCount : serverMemberCountParam;
    } else {
      poll = pollOrGuildId;
      if (typeof pollIdOrMemberCount === 'number') {
        serverMemberCount = pollIdOrMemberCount;
      }
    }

    if (!poll) return null;

    const votes = pollRepository.getVotes(poll.guildId, poll.id);
    const uniqueParticipants = new Set(votes.map((v) => v.userId)).size;

    const questionsResults: any[] = [];
    let overallWinningOption: any;
    let highestPointsAcrossPoll = -1;

    for (const question of poll.questions) {
      const questionTotalPoints = question.options.reduce((acc, opt) => acc + (opt.points || 0), 0);
      const questionTotalVotes = question.options.reduce((acc, opt) => acc + (opt.votesCount || 0), 0);

      const optionsResults = question.options.map((opt) => {
        const percentage =
          questionTotalPoints > 0 ? Math.round(((opt.points || 0) / questionTotalPoints) * 1000) / 10 : 0;
        return {
          optionId: opt.id,
          label: opt.label,
          text: opt.label,
          emoji: opt.emoji,
          color: opt.color,
          votesCount: opt.votesCount || 0,
          voteCount: opt.votesCount || 0,
          weightedPoints: opt.points || 0,
          weightedScore: opt.points || 0,
          percentage,
        };
      });

      // Sort by points descending
      optionsResults.sort((a, b) => b.weightedPoints - a.weightedPoints);

      const winningOption = optionsResults[0]?.weightedPoints > 0 ? optionsResults[0] : undefined;

      if (winningOption && winningOption.weightedPoints > highestPointsAcrossPoll) {
        highestPointsAcrossPoll = winningOption.weightedPoints;
        overallWinningOption = winningOption;
      }

      questionsResults.push({
        questionId: question.id,
        title: question.title,
        totalVotes: questionTotalVotes,
        options: optionsResults,
        optionResults: optionsResults,
        winningOption,
        winners: winningOption ? [winningOption] : [],
      });
    }

    // Quorum & Majority calculation
    const quorum = poll.quorum;
    let quorumStatus: PollResultsSummary['quorumStatus'] = 'NOT_APPLICABLE';
    let approvalPercentage = 0;

    const participationRate =
      serverMemberCount > 0 ? Math.round((uniqueParticipants / serverMemberCount) * 1000) / 10 : 0;

    if (quorum && quorum.enabled) {
      const quorumMetByCount = !quorum.minParticipantsCount || uniqueParticipants >= quorum.minParticipantsCount;
      const quorumMetByPercent =
        !quorum.minParticipationPercentage || participationRate >= quorum.minParticipationPercentage;

      if (!quorumMetByCount || !quorumMetByPercent) {
        quorumStatus = 'QUORUM_NOT_REACHED';
      } else {
        // Evaluate approval percentage if YES_NO or APPROVAL
        if (poll.type === 'APPROVAL' || poll.type === 'YES_NO') {
          const firstQ = questionsResults[0];
          const approveOpt = firstQ?.options.find(
            (o) => o.optionId === 'opt-approve' || o.label.toLowerCase().includes('oui') || o.label.toLowerCase().includes('approuv')
          );
          approvalPercentage = approveOpt ? approveOpt.percentage : 0;

          if (approvalPercentage >= (quorum.approvalThresholdPercentage || 50)) {
            quorumStatus = 'PASSED';
          } else {
            quorumStatus = 'REJECTED';
          }
        } else {
          quorumStatus = 'PASSED';
        }
      }
    }

    return {
      pollId: poll.id,
      title: poll.title,
      status: poll.status,
      totalVotes: votes.length,
      totalVoters: uniqueParticipants,
      uniqueParticipants,
      totalWeightedVotes: votes.length,
      serverMemberCount,
      participationRate,
      quorumStatus,
      approvalPercentage,
      quorumPercentage: approvalPercentage || participationRate,
      questionsResults,
      questionResults: questionsResults,
      winningOption: overallWinningOption,
      endsAt: poll.endsAt,
    };
  }
}

export const pollResultService = new PollResultService();
