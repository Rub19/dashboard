export interface InstagramPostResult {
  shortcode: string;
  postUrl: string;
  caption: string;
  authorUsername?: string;
  thumbnailUrl?: string;
}

export interface InstagramUserResult {
  username: string;
  profileUrl: string;
}

export class InstagramService {
  getPostInfo(rawUrl: string): InstagramPostResult {
    const trimmed = rawUrl.trim();
    const match = trimmed.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
    const shortcode = match ? match[1] : trimmed;
    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    return {
      shortcode,
      postUrl,
      caption: `Publication Instagram #${shortcode}`,
    };
  }

  getUserInfo(rawUsername: string): InstagramUserResult {
    const username = rawUsername.replace(/^@+/, "").replace(/\/+$/, "").trim();
    return {
      username,
      profileUrl: `https://www.instagram.com/${encodeURIComponent(username)}/`,
    };
  }
}

export const instagramService = new InstagramService();
