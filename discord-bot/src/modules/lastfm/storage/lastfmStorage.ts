import fs from "fs";
import path from "path";
import { LastFmUserLink } from "../types/lastfmTypes.js";
import { logger } from "../../../utils/logger.js";

class LastFmStorage {
  private dataDir = path.resolve(process.cwd(), "data");
  private filePath = path.resolve(this.dataDir, "lastfm_users.json");
  private users = new Map<string, LastFmUserLink>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          for (const [userId, linkData] of Object.entries(parsed)) {
            if (linkData && typeof linkData === "object") {
              this.users.set(userId, linkData as LastFmUserLink);
            }
          }
        }
      }
    } catch (err) {
      logger.error("[LastFmStorage] Failed to load user links:", err);
    }
  }

  private save(): void {
    try {
      const obj: Record<string, LastFmUserLink> = {};
      for (const [userId, linkData] of this.users.entries()) {
        obj[userId] = linkData;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), "utf8");
    } catch (err) {
      logger.error("[LastFmStorage] Failed to save user links:", err);
    }
  }

  public get(userId: string): LastFmUserLink | null {
    return this.users.get(userId) || null;
  }

  public getUsername(userId: string): string | null {
    return this.users.get(userId)?.username || null;
  }

  public set(userId: string, username: string): LastFmUserLink {
    const link: LastFmUserLink = {
      discordUserId: userId,
      username: username.trim(),
      linkedAt: new Date().toISOString(),
    };
    this.users.set(userId, link);
    this.save();
    return link;
  }

  public delete(userId: string): boolean {
    const deleted = this.users.delete(userId);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  public has(userId: string): boolean {
    return this.users.has(userId);
  }

  public getAll(): LastFmUserLink[] {
    return Array.from(this.users.values());
  }
}

export const lastFmStorage = new LastFmStorage();
