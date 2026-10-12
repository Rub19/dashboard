import fs from 'fs';
import path from 'path';
import { SpotifyTokens } from '../types/spotify.js';
import { logger } from '../../../utils/logger.js';

class SpotifyStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'spotify_tokens.json');
  private tokens = new Map<string, SpotifyTokens>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [userId, tokenData] of Object.entries(parsed)) {
            if (tokenData && typeof tokenData === 'object') {
              this.tokens.set(userId, tokenData as SpotifyTokens);
            }
          }
        }
      }
    } catch (err) {
      logger.error('[SpotifyStorage] Failed to load tokens:', err);
    }
  }

  private save(): void {
    try {
      const obj: Record<string, SpotifyTokens> = {};
      for (const [userId, tokenData] of this.tokens.entries()) {
        obj[userId] = tokenData;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      logger.error('[SpotifyStorage] Failed to save tokens:', err);
    }
  }

  public get(userId: string): SpotifyTokens | null {
    return this.tokens.get(userId) || null;
  }

  public set(userId: string, tokens: SpotifyTokens): void {
    this.tokens.set(userId, tokens);
    this.save();
  }

  public delete(userId: string): boolean {
    const deleted = this.tokens.delete(userId);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  public has(userId: string): boolean {
    return this.tokens.has(userId);
  }
}

export const spotifyStorage = new SpotifyStorage();
