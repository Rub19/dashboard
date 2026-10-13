export interface TwitterPostResult {
  tweetId: string;
  webUrl: string;
  fixEmbedUrl: string;
  caption: string;
  username?: string;
}

export interface TwitterUserResult {
  username: string;
  profileUrl: string;
}

export class TwitterService {
  getPostInfo(rawUrl: string): TwitterPostResult {
    const trimmed = rawUrl.trim();
    const match = trimmed.match(/(?:status|statuses)\/(\d+)/i) || trimmed.match(/^(\d+)$/);
    const tweetId = match ? match[1] : trimmed;
    const userMatch = trimmed.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)\/status/i);
    const username = userMatch ? userMatch[1] : "utilisateur";
    const webUrl = `https://x.com/${username}/status/${tweetId}`;
    const fixEmbedUrl = `https://fxtwitter.com/${username}/status/${tweetId}`;
    return {
      tweetId,
      webUrl,
      fixEmbedUrl,
      caption: `Post X / Twitter #${tweetId}`,
      username,
    };
  }

  getUserInfo(rawUsername: string): TwitterUserResult {
    const username = rawUsername.replace(/^@+/, "").replace(/\/+$/, "").trim();
    return {
      username,
      profileUrl: `https://x.com/${encodeURIComponent(username)}`,
    };
  }
}

export const twitterService = new TwitterService();
