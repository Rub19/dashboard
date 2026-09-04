import {
  DiscordPoll,
  PollResultsSummary,
} from '../types/index.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollResultService } from './pollResultService.js';
import { pollAutomationService } from './pollAutomationService.js';

export class PollService {
  /**
   * Publish a poll to active status.
   */
  public publishPoll(guildId: string, pollId: string): { success: boolean; poll?: DiscordPoll; error?: string } {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) return { success: false, error: 'Sondage introuvable.' };

    poll.status = 'ACTIVE';
    poll.startsAt = new Date().toISOString();
    poll.updatedAt = new Date().toISOString();

    pollRepository.savePoll(poll);
    return { success: true, poll };
  }

  /**
   * Pause an active poll.
   */
  public pausePoll(guildId: string, pollId: string): { success: boolean; poll?: DiscordPoll; error?: string } {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) return { success: false, error: 'Sondage introuvable.' };

    poll.status = 'PAUSED';
    poll.updatedAt = new Date().toISOString();

    pollRepository.savePoll(poll);
    return { success: true, poll };
  }

  /**
   * Resume a paused poll.
   */
  public resumePoll(guildId: string, pollId: string): { success: boolean; poll?: DiscordPoll; error?: string } {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) return { success: false, error: 'Sondage introuvable.' };

    poll.status = 'ACTIVE';
    poll.updatedAt = new Date().toISOString();

    pollRepository.savePoll(poll);
    return { success: true, poll };
  }

  /**
   * End a poll immediately and trigger automations.
   */
  public async endPoll(guildId: string, pollId: string, client?: any): Promise<{
    success: boolean;
    poll?: DiscordPoll;
    results?: PollResultsSummary;
    error?: string;
  }> {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) return { success: false, error: 'Sondage introuvable.' };

    poll.status = 'ENDED';
    poll.endedAt = new Date().toISOString();
    poll.updatedAt = new Date().toISOString();

    pollRepository.savePoll(poll);

    const results = pollResultService.calculateResults(poll);
    await pollAutomationService.executeTrigger('POLL_ENDED', poll, results);

    if (results.winningOption) {
      await pollAutomationService.executeTrigger('WINNER_DETERMINED', poll, results);
    }
    if (results.quorumStatus === 'PASSED') {
      await pollAutomationService.executeTrigger('QUORUM_REACHED', poll, results);
      await pollAutomationService.executeTrigger('THRESHOLD_PASSED', poll, results);
    }

    return { success: true, poll, results };
  }

  /**
   * Extend the deadline of a poll.
   */
  public extendPoll(guildId: string, pollId: string, extraHours: number): { success: boolean; poll?: DiscordPoll; error?: string } {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) return { success: false, error: 'Sondage introuvable.' };

    const currentEnd = poll.endsAt ? new Date(poll.endsAt).getTime() : Date.now();
    const newEnd = new Date(currentEnd + extraHours * 3600000).toISOString();

    poll.endsAt = newEnd;
    if (poll.status === 'ENDED') {
      poll.status = 'ACTIVE';
      poll.endedAt = undefined;
    }
    poll.updatedAt = new Date().toISOString();

    pollRepository.savePoll(poll);
    return { success: true, poll };
  }

  /**
   * Duplicate a poll.
   */
  public duplicatePoll(guildId: string, pollId: string): { success: boolean; poll?: DiscordPoll; error?: string } {
    const duplicate = pollRepository.duplicatePoll(guildId, pollId);
    if (!duplicate) return { success: false, error: 'Sondage introuvable.' };
    return { success: true, poll: duplicate };
  }

  /**
   * Export poll votes as CSV or JSON.
   */
  public exportPoll(guildId: string, pollId: string, format: 'csv' | 'json'): string {
    const poll = pollRepository.getPollById(guildId, pollId);
    const votes = pollRepository.getVotes(guildId, pollId);

    if (format === 'json') {
      const results = poll ? pollResultService.calculateResults(poll) : null;
      return JSON.stringify({ poll, results, votes }, null, 2);
    }

    // CSV format
    const headers = ['VoteId', 'GuildId', 'PollId', 'UserId', 'UserTag', 'QuestionId', 'SelectedOptions', 'Weight', 'VotedAt'];
    const rows = votes.map((v) => [
      `"${v.id}"`,
      `"${v.guildId}"`,
      `"${v.pollId}"`,
      `"${v.userId}"`,
      `"${v.userTag}"`,
      `"${v.questionId}"`,
      `"${v.selectedOptionIds.join(';')}"`,
      v.weight,
      `"${v.votedAt}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportVotesToCsv(guildId: string, pollId: string): string {
    return this.exportPoll(guildId, pollId, 'csv');
  }

  public exportVotesToJson(guildId: string, pollId: string): string {
    const votes = pollRepository.getVotes(guildId, pollId);
    return JSON.stringify(votes, null, 2);
  }
}

export const pollService = new PollService();
