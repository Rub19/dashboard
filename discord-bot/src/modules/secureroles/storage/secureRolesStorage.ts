import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditEntry, AuditType, SecureMemberRecord, SecureRolesConfig, SecureRolesConfigSchema, SecureSession } from '../types/secureRoles.js';
import { logger } from '../../../utils/logger.js';

const AUDIT_PER_GUILD = 300;
const ENDED_SESSION_KEEP_MS = 90 * 86_400_000;

interface FileShape {
  configs: SecureRolesConfig[];
  members: SecureMemberRecord[];
  sessions: SecureSession[];
  audit: AuditEntry[];
}

/** Persistance JSON du module Rôles sécurisés (`data/secure_roles.json`). Écritures synchrones : un état d'accès ne doit pas se perdre. */
class SecureRolesStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'secure_roles.json');
  private configs = new Map<string, SecureRolesConfig>();
  private members = new Map<string, SecureMemberRecord>();
  private sessions: SecureSession[] = [];
  private audit: AuditEntry[] = [];

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Partial<FileShape>;
      for (const c of raw.configs ?? []) {
        const res = SecureRolesConfigSchema.safeParse(c);
        if (res.success) this.configs.set(res.data.guildId, res.data);
      }
      for (const m of raw.members ?? []) this.members.set(`${m.guildId}:${m.userId}`, m);
      this.sessions = raw.sessions ?? [];
      this.audit = raw.audit ?? [];
    } catch (err) {
      logger.error('[SecureRoles] Échec du chargement de secure_roles.json :', err);
    }
  }

  private save() {
    try {
      const cutoff = Date.now() - ENDED_SESSION_KEEP_MS;
      this.sessions = this.sessions.filter((s) => !s.endedAt || new Date(s.endedAt).getTime() > cutoff);
      const data: FileShape = { configs: [...this.configs.values()], members: [...this.members.values()], sessions: this.sessions, audit: this.audit };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.error('[SecureRoles] Échec de la sauvegarde de secure_roles.json :', err);
    }
  }

  // --- Configuration ---
  getConfig(guildId: string): SecureRolesConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = SecureRolesConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.save();
    }
    return conf;
  }

  updateConfig(guildId: string, patch: Partial<SecureRolesConfig>): SecureRolesConfig {
    const next = SecureRolesConfigSchema.parse({ ...this.getConfig(guildId), ...patch, guildId, updatedAt: new Date().toISOString() });
    this.configs.set(guildId, next);
    this.save();
    return next;
  }

  guildIdsWithRoles(): string[] {
    return [...this.configs.values()].filter((c) => c.roles.length > 0).map((c) => c.guildId);
  }

  // --- Membres ---
  getMember(guildId: string, userId: string): SecureMemberRecord | undefined {
    return this.members.get(`${guildId}:${userId}`);
  }

  listMembers(guildId: string): SecureMemberRecord[] {
    return [...this.members.values()].filter((m) => m.guildId === guildId);
  }

  saveMember(rec: SecureMemberRecord): SecureMemberRecord {
    this.members.set(`${rec.guildId}:${rec.userId}`, rec);
    this.save();
    return rec;
  }

  deleteMember(guildId: string, userId: string): boolean {
    const ok = this.members.delete(`${guildId}:${userId}`);
    if (ok) this.save();
    return ok;
  }

  // --- Sessions ---
  addSession(s: Omit<SecureSession, 'id'>): SecureSession {
    const session: SecureSession = { ...s, id: crypto.randomUUID() };
    this.sessions.push(session);
    this.save();
    return session;
  }

  activeSessions(guildId?: string): SecureSession[] {
    return this.sessions.filter((s) => !s.endedAt && (!guildId || s.guildId === guildId));
  }

  activeSessionFor(guildId: string, userId: string): SecureSession | undefined {
    return this.sessions.find((s) => !s.endedAt && s.guildId === guildId && s.userId === userId);
  }

  endSession(id: string, reason: NonNullable<SecureSession['endReason']>): SecureSession | undefined {
    const s = this.sessions.find((x) => x.id === id && !x.endedAt);
    if (!s) return undefined;
    s.endedAt = new Date().toISOString();
    s.endReason = reason;
    this.save();
    return s;
  }

  // --- Journal ---
  log(guildId: string, type: AuditType, detail: string, extra: { userId?: string | null; actorId?: string | null; roleId?: string | null } = {}) {
    this.audit.push({ id: crypto.randomUUID(), guildId, type, detail, userId: extra.userId ?? null, actorId: extra.actorId ?? null, roleId: extra.roleId ?? null, at: new Date().toISOString() });
    const mine = this.audit.filter((a) => a.guildId === guildId);
    if (mine.length > AUDIT_PER_GUILD) {
      const drop = new Set(mine.slice(0, mine.length - AUDIT_PER_GUILD).map((a) => a.id));
      this.audit = this.audit.filter((a) => !drop.has(a.id));
    }
    this.save();
  }

  getAudit(guildId: string, limit = 100): AuditEntry[] {
    return this.audit.filter((a) => a.guildId === guildId).slice(-limit).reverse();
  }
}

export const secureRolesStorage = new SecureRolesStorage();
