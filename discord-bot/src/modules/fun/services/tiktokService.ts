export interface TikTokVideoResult {
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  webUrl: string;
}

export interface TikTokUserResult {
  username: string;
  profileUrl: string;
  displayName: string;
}

export class TikTokService {
  async getVideoInfo(url: string): Promise<TikTokVideoResult | null> {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl.includes("tiktok.com/")) {
        return null;
      }
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(oembedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!res.ok) {
        return {
          title: "Vidéo TikTok",
          authorName: "Créateur TikTok",
          authorUrl: cleanUrl,
          thumbnailUrl: "",
          webUrl: cleanUrl,
        };
      }
      const data = (await res.json()) as any;
      return {
        title: data.title || "Vidéo TikTok",
        authorName: data.author_name || "Créateur TikTok",
        authorUrl: data.author_url || cleanUrl,
        thumbnailUrl: data.thumbnail_url || "",
        webUrl: cleanUrl,
      };
    } catch {
      return null;
    }
  }

  getUserInfo(rawUsername: string): TikTokUserResult {
    const username = rawUsername.replace(/^@+/, "").trim();
    return {
      username,
      displayName: `@${username}`,
      profileUrl: `https://www.tiktok.com/@${encodeURIComponent(username)}`,
    };
  }
}

export const tiktokService = new TikTokService();
