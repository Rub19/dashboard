import { Suggestion, SuggestionComment } from '../types/suggestion.js';
import { suggestionStorage } from '../storage/suggestionStorage.js';

export class SuggestionCommentService {
  public static addComment(
    suggestionId: string,
    data: {
      userId: string;
      userTag: string;
      avatarUrl?: string | null;
      content: string;
      isStaff?: boolean;
    }
  ): Suggestion | null {
    const suggestion = suggestionStorage.getById(suggestionId);
    if (!suggestion) return null;

    const newComment: SuggestionComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      userTag: data.userTag,
      avatarUrl: data.avatarUrl || null,
      content: data.content,
      isStaff: data.isStaff || false,
      timestamp: new Date().toISOString(),
    };

    const comments = [...suggestion.comments, newComment];

    return suggestionStorage.update(suggestionId, { comments });
  }

  public static toggleFollow(suggestionId: string, userId: string): { isFollowing: boolean } {
    const suggestion = suggestionStorage.getById(suggestionId);
    if (!suggestion) return { isFollowing: false };

    let followerIds = [...suggestion.followerIds];
    const exists = followerIds.includes(userId);

    if (exists) {
      followerIds = followerIds.filter((id) => id !== userId);
    } else {
      followerIds.push(userId);
    }

    suggestionStorage.update(suggestionId, { followerIds });
    return { isFollowing: !exists };
  }
}
