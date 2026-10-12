export interface PinterestPinResult {
  pinId: string;
  pinUrl: string;
  sourceUrl?: string;
  title: string;
}

export interface PinterestUserResult {
  username: string;
  profileUrl: string;
}

export interface PinterestSearchResult {
  query: string;
  searchUrl: string;
}

export class PinterestService {
  getPinInfo(rawInput: string): PinterestPinResult {
    const trimmed = rawInput.trim();
    const idMatch = trimmed.match(/\/pin\/(\d+)/i) || trimmed.match(/^(\d+)$/);
    const pinId = idMatch ? idMatch[1] : trimmed;
    const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
    return {
      pinId,
      pinUrl,
      title: `Épingle Pinterest #${pinId}`,
    };
  }

  getUserInfo(rawUsername: string): PinterestUserResult {
    const username = rawUsername.replace(/^@+/, "").replace(/\/+$/, "").trim();
    return {
      username,
      profileUrl: `https://www.pinterest.com/${encodeURIComponent(username)}/`,
    };
  }

  searchPins(query: string): PinterestSearchResult {
    const trimmed = query.trim();
    return {
      query: trimmed,
      searchUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(trimmed)}`,
    };
  }
}

export const pinterestService = new PinterestService();
