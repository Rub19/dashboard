import { Suggestion, SuggestionVoteType } from '../types/suggestion.js';
import { suggestionStorage } from '../storage/suggestionStorage.js';

export class SuggestionVoteService {
  public static handleVote(
    suggestionId: string,
    userId: string,
    type: SuggestionVoteType
  ): { suggestion: Suggestion | null; action: 'added' | 'removed' | 'changed' } {
    const suggestion = suggestionStorage.getById(suggestionId);
    if (!suggestion) return { suggestion: null, action: 'removed' };

    const votes = [...suggestion.votes];
    const existingIndex = votes.findIndex((v) => v.userId === userId);

    let action: 'added' | 'removed' | 'changed' = 'added';

    if (existingIndex !== -1) {
      if (votes[existingIndex].type === type) {
        // Annulation du vote (Toggle off)
        votes.splice(existingIndex, 1);
        action = 'removed';
      } else {
        // Changement de vote
        votes[existingIndex] = {
          userId,
          type,
          timestamp: new Date().toISOString(),
        };
        action = 'changed';
      }
    } else {
      // Nouveau vote
      votes.push({
        userId,
        type,
        timestamp: new Date().toISOString(),
      });
      action = 'added';
    }

    const upvotesCount = votes.filter((v) => v.type === 'up').length;
    const downvotesCount = votes.filter((v) => v.type === 'down').length;
    const score = upvotesCount - downvotesCount;

    const updated = suggestionStorage.update(suggestionId, {
      votes,
      upvotesCount,
      downvotesCount,
      score,
    });

    return { suggestion: updated, action };
  }
}
