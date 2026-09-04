import {
  DiscordPoll,
  PollVote,
} from '../types/index.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollEligibilityService } from './pollEligibilityService.js';

export interface CastVoteParams {
  guildId: string;
  pollId: string;
  userId: string;
  userTag: string;
  userAvatar?: string;
  questionId: string;
  selectedOptionIds: string[];
  userRoleIds?: string[];
  accountAgeDays?: number;
  guildMemberDays?: number;
}

export class PollVotingService {
  /**
   * Cast or update a vote on a poll question.
   */
  public castVote(
    paramsOrGuildId: CastVoteParams | string,
    pollId?: string,
    userId?: string,
    userTag?: string,
    userAvatar?: string,
    userRoleIds?: string[],
    accountAgeDays?: number,
    guildMemberDays?: number,
    selectionsOrOptions?: Record<string, string[]> | string[],
    satisfactionScore?: number,
    rankingOrder?: string[]
  ): {
    success: boolean;
    vote?: PollVote;
    error?: string;
  } {
    let params: CastVoteParams;

    if (typeof paramsOrGuildId === 'string') {
      const gId = paramsOrGuildId;
      const pId = pollId || '';
      const uId = userId || '';
      const poll = pollRepository.getPollById(gId, pId);
      const defaultQId = poll?.questions[0]?.id || 'q1';

      let selectedOptionIds: string[] = [];
      let questionId = defaultQId;

      if (Array.isArray(selectionsOrOptions)) {
        selectedOptionIds = selectionsOrOptions;
      } else if (selectionsOrOptions && typeof selectionsOrOptions === 'object') {
        const firstKey = Object.keys(selectionsOrOptions)[0];
        if (firstKey) {
          questionId = firstKey;
          selectedOptionIds = selectionsOrOptions[firstKey] || [];
        }
      }

      params = {
        guildId: gId,
        pollId: pId,
        userId: uId,
        userTag: userTag || 'Votant',
        userAvatar,
        questionId,
        selectedOptionIds,
        userRoleIds: userRoleIds || [],
        accountAgeDays: accountAgeDays || 0,
        guildMemberDays: guildMemberDays || 0,
      };
    } else {
      params = paramsOrGuildId;
    }

    const poll = pollRepository.getPollById(params.guildId, params.pollId);
    if (!poll) {
      return { success: false, error: 'Sondage introuvable.' };
    }

    if (poll.status !== 'ACTIVE') {
      return { success: false, error: 'Ce sondage n\'est pas actif actuellement.' };
    }

    if (poll.endsAt && new Date(poll.endsAt).getTime() <= Date.now()) {
      poll.status = 'ENDED';
      poll.endedAt = new Date().toISOString();
      pollRepository.savePoll(poll);
      return { success: false, error: 'Ce sondage a expiré et est désormais clos.' };
    }

    // 1. Eligibility Check
    const eligibilityResult = pollEligibilityService.checkEligibility(poll, {
      userId: params.userId,
      accountAgeDays: params.accountAgeDays || 0,
      guildMemberDays: params.guildMemberDays || 0,
      userRoleIds: params.userRoleIds || [],
    });

    if (!eligibilityResult.eligible) {
      return { success: false, error: eligibilityResult.reason || 'Vous n\'êtes pas éligible pour voter.' };
    }

    const question = poll.questions.find((q) => q.id === params.questionId) || poll.questions[0];
    if (!question) {
      return { success: false, error: 'Question introuvable dans ce sondage.' };
    }

    // 2. Validate selections count
    if (params.selectedOptionIds.length < (question.minSelections || 1)) {
      return {
        success: false,
        error: `Vous devez sélectionner au moins ${question.minSelections || 1} option(s).`,
      };
    }
    if (params.selectedOptionIds.length > (question.maxSelections || 1)) {
      return {
        success: false,
        error: `Vous ne pouvez pas sélectionner plus de ${question.maxSelections || 1} option(s).`,
      };
    }

    // 3. Compute Vote Weight
    const weight = pollEligibilityService.getVoteWeight(poll, params.userRoleIds || []);

    // 4. Duplicate Check & Vote Modification
    const existingVote = pollRepository.getUserVote(params.guildId, params.pollId, params.userId, question.id);

    if (existingVote) {
      if (!poll.allowVoteChange) {
        return { success: false, error: 'La modification de votre vote n\'est pas autorisée sur ce sondage.' };
      }

      // Revert previous points from options
      for (const optId of existingVote.selectedOptionIds) {
        const opt = question.options.find((o) => o.id === optId);
        if (opt) {
          opt.votesCount = Math.max(0, opt.votesCount - 1);
          opt.points = Math.max(0, opt.points - existingVote.weight);
        }
      }
    }

    // Apply points to new options
    for (const optId of params.selectedOptionIds) {
      const opt = question.options.find((o) => o.id === optId);
      if (opt) {
        opt.votesCount += 1;
        opt.points += weight;
      }
    }

    pollRepository.savePoll(poll);

    // 5. Build Vote entity respecting anonymity
    const isAnonymous = poll.anonymity === 'ANONYMOUS' || poll.anonymity === 'FULLY_ANONYMOUS';
    const displayTag = isAnonymous ? 'Votant Anonyme' : params.userTag;
    const displayAvatar = isAnonymous
      ? 'https://cdn.discordapp.com/embed/avatars/0.png'
      : params.userAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const vote: PollVote = {
      id: existingVote?.id || `vote-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      pollId: poll.id,
      guildId: poll.guildId,
      userId: params.userId,
      userTag: displayTag,
      userAvatar: displayAvatar,
      questionId: question.id,
      selectedOptionIds: params.selectedOptionIds,
      weight,
      votedAt: new Date().toISOString(),
    };

    pollRepository.saveVote(vote);

    return { success: true, vote };
  }

  /**
   * Retract a previously cast vote if allowed.
   */
  public retractVote(guildId: string, pollId: string, userId: string, questionId: string): boolean {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll || !poll.allowVoteRetract) return false;

    const existingVote = pollRepository.getUserVote(guildId, pollId, userId, questionId);
    if (!existingVote) return false;

    const question = poll.questions.find((q) => q.id === questionId);
    if (question) {
      for (const optId of existingVote.selectedOptionIds) {
        const opt = question.options.find((o) => o.id === optId);
        if (opt) {
          opt.votesCount = Math.max(0, opt.votesCount - 1);
          opt.points = Math.max(0, opt.points - existingVote.weight);
        }
      }
      pollRepository.savePoll(poll);
    }

    return pollRepository.deleteUserVote(guildId, pollId, userId, questionId);
  }
}

export const pollVotingService = new PollVotingService();
