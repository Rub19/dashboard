import fs from 'fs';
import path from 'path';
import { Client, GuildMember, PermissionFlagsBits } from 'discord.js';
import { AutoRoleConfig, AutoRoleConfigSchema } from '../types/autoRoleConfig.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';
import { isSensitiveRole } from '../../../utils/roleSafety.js';

class AutoRoleService {
  private configPath = path.resolve(process.cwd(), 'data', 'auto_roles.json');
  private configs = new Map<string, AutoRoleConfig>();
  private client: Client | null = null;
  private scheduledSyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  /** Démarre la vérification horaire des synchronisations programmées (voir runScheduledSyncTick). */
  public initialize(client: Client) {
    this.client = client;
    if (this.scheduledSyncTimer) return;
    this.scheduledSyncTimer = setInterval(() => {
      void this.runScheduledSyncTick().catch((err) => logger.error('[AutoRole] Erreur tick de synchro programmée :', err));
    }, 3_600_000).unref();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = AutoRoleConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement auto_roles.json :', err);
    }
  }

  private saveData() {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde auto_roles.json :', err);
    }
  }

  public getConfig(guildId: string): AutoRoleConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = AutoRoleConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveData();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<AutoRoleConfig>): AutoRoleConfig {
    const current = this.getConfig(guildId);
    const valid = AutoRoleConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveData();
    return valid;
  }

  /** Rôles "de base" applicables à ce membre selon son type (bot/humain), avant overrides personnels. */
  private baseRoleIdsFor(config: AutoRoleConfig, isBot: boolean): string[] {
    if (isBot && config.useSeparateBotRoles) return config.botRoleIds;
    return config.roleIds;
  }

  private delayFor(config: AutoRoleConfig, isBot: boolean): number {
    return isBot && config.useSeparateBotRoles ? config.botDelaySeconds : config.delaySeconds;
  }

  private hasAnythingToAssign(config: AutoRoleConfig, member: GuildMember): boolean {
    const base = this.baseRoleIdsFor(config, member.user.bot);
    if (base.length > 0) return true;
    return config.userOverrides.some((o) => o.userId === member.id && o.roleIds.length > 0);
  }

  public async assignOnJoin(member: GuildMember): Promise<string[]> {
    const config = this.getConfig(member.guild.id);
    if (!config.enabled) return [];

    // Filtre bots vs humains
    const isBot = member.user.bot;
    if (isBot && !config.applyToBots) return [];
    if (!isBot && !config.applyToHumans) return [];
    if (!this.hasAnythingToAssign(config, member)) return [];

    // En attente du filtrage des règles : rien maintenant, handleScreeningPassed() prend le relais
    // quand pending passe à false (guildMemberUpdate).
    if (config.waitForScreening && member.pending) return [];

    const delay = this.delayFor(config, isBot);
    if (delay > 0) {
      setTimeout(() => {
        void this.applyRoles(member).catch(() => null);
      }, delay * 1000).unref();
      return [];
    }

    return this.applyRoles(member);
  }

  /** Reprend l'attribution une fois le filtrage des règles validé (pending: true -> false). */
  public async handleScreeningPassed(member: GuildMember): Promise<string[]> {
    const config = this.getConfig(member.guild.id);
    if (!config.enabled || !config.waitForScreening) return [];
    const isBot = member.user.bot;
    if (isBot && !config.applyToBots) return [];
    if (!isBot && !config.applyToHumans) return [];
    if (!this.hasAnythingToAssign(config, member)) return [];

    const delay = this.delayFor(config, isBot);
    if (delay > 0) {
      setTimeout(() => {
        void this.applyRoles(member).catch(() => null);
      }, delay * 1000).unref();
      return [];
    }
    return this.applyRoles(member);
  }

  /** Applique les rôles configurés (base + override personnel éventuel) à un membre donné qui les manque
   * (rejoue enabled/roleIds : peut avoir changé pendant un délai programmé). */
  private async applyRoles(member: GuildMember): Promise<string[]> {
    const guild = member.guild;
    const config = this.getConfig(guild.id);
    if (!config.enabled) return [];
    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      logger.warn(`[AutoRole] Permission ManageRoles manquante sur le serveur ${guild.name}.`);
      return [];
    }

    const override = config.userOverrides.find((o) => o.userId === member.id);
    const roleIdsToApply = [...new Set([...this.baseRoleIdsFor(config, member.user.bot), ...(override?.roleIds || [])])];
    if (roleIdsToApply.length === 0) return [];

    const assignedNames: string[] = [];
    const botHighest = botMember.roles.highest.position;

    for (const roleId of roleIdsToApply) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (!role || role.managed || role.id === guild.id) continue;
        if (isSensitiveRole(role)) {
          logger.warn(`[AutoRole] Rôle sensible "${role.name}" refusé : jamais donné automatiquement à l'arrivée.`);
          continue;
        }

        if (role.position >= botHighest) {
          logger.warn(`[AutoRole] Rôle "${role.name}" trop haut dans la hiérarchie pour être attribué.`);
          continue;
        }

        await member.roles.add(role, 'Attribution automatique à l’arrivée (Auto-Role)');
        assignedNames.push(role.name);
      } catch (err) {
        logger.error(`[AutoRole] Échec d’attribution du rôle ${roleId} à ${member.user.tag} :`, err);
      }
    }

    if (override && config.removeUserFromListAfterAssignment) {
      this.updateConfig(guild.id, { userOverrides: config.userOverrides.filter((o) => o.userId !== member.id) });
    }

    if (assignedNames.length > 0) {
      await logService.log(guild, {
        category: 'members',
        type: 'MEMBER_UPDATE',
        title: '🎭 Auto-Rôles Attribués',
        description: `Des rôles automatiques ont été attribués à **${member.user.tag}** dès son arrivée.`,
        color: '#8B5CF6',
        userId: member.id,
        userTag: member.user.tag,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
          { name: 'Rôles attribués', value: assignedNames.map((n) => `\`@${n}\``).join(', '), inline: true },
        ],
      });
    }

    return assignedNames;
  }

  /** Nombre de membres concernés (humains/bots selon la config) qui n'ont aucun des rôles configurés. */
  public async countMissing(guild: GuildMember['guild']): Promise<number> {
    const config = this.getConfig(guild.id);
    if (!config.enabled) return 0;
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return 0;
    let missing = 0;
    for (const member of members.values()) {
      if (member.user.bot && !config.applyToBots) continue;
      if (!member.user.bot && !config.applyToHumans) continue;
      const base = this.baseRoleIdsFor(config, member.user.bot);
      if (base.length === 0) continue;
      if (!base.some((id) => member.roles.cache.has(id))) missing++;
    }
    return missing;
  }

  /** "Sync now" (ou programmée) : attribue les rôles configurés (hors exclus) et les overrides personnels
   * aux membres existants qui ne les ont pas déjà. */
  public async syncGuild(guild: GuildMember['guild']): Promise<{ updated: number; total: number }> {
    const config = this.getConfig(guild.id);
    if (!config.enabled) return { updated: 0, total: 0 };
    const botMember = guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) return { updated: 0, total: 0 };
    const botHighest = botMember.roles.highest.position;

    const assignable = (ids: string[]) =>
      ids.filter((id) => {
        if (config.excludeFromSyncRoleIds.includes(id)) return false;
        const role = guild.roles.cache.get(id);
        return role && !role.managed && role.id !== guild.id && role.position < botHighest;
      });

    const humanRoleIds = assignable(config.roleIds);
    const botRoleIds = assignable(config.useSeparateBotRoles ? config.botRoleIds : config.roleIds);

    const members = await guild.members.fetch().catch(() => null);
    if (!members) return { updated: 0, total: 0 };

    let updated = 0;
    for (const member of members.values()) {
      const isBot = member.user.bot;
      if (isBot && !config.applyToBots) continue;
      if (!isBot && !config.applyToHumans) continue;

      const override = config.userOverrides.find((o) => o.userId === member.id);
      const base = isBot ? botRoleIds : humanRoleIds;
      const wanted = [...new Set([...base, ...assignable(override?.roleIds || [])])];
      const missing = wanted.filter((id) => !member.roles.cache.has(id) && !(guild.roles.cache.get(id) && isSensitiveRole(guild.roles.cache.get(id)!)));
      if (missing.length === 0) continue;
      try {
        await member.roles.add(missing, 'Synchronisation des rôles automatiques (Auto-Role)');
        updated++;
        if (override && config.removeUserFromListAfterAssignment && override.roleIds.every((id) => missing.includes(id) || member.roles.cache.has(id))) {
          this.updateConfig(guild.id, { userOverrides: this.getConfig(guild.id).userOverrides.filter((o) => o.userId !== member.id) });
        }
      } catch (err) {
        logger.error(`[AutoRole] Échec de synchro pour ${member.user.tag} :`, err);
      }
    }

    return { updated, total: members.size };
  }

  /** "Sync now" déclenché depuis le dashboard : met aussi à jour lastSyncAt et journalise. */
  public async manualSync(guild: GuildMember['guild']): Promise<{ updated: number; total: number }> {
    const result = await this.syncGuild(guild);
    this.updateConfig(guild.id, { lastSyncAt: new Date().toISOString() });
    if (result.updated > 0) {
      await logService.log(guild, {
        category: 'members',
        type: 'MEMBER_UPDATE',
        title: '🔁 Auto-Rôles synchronisés',
        description: `Synchronisation manuelle : ${result.updated} membre(s) sur ${result.total} ont reçu les rôles manquants.`,
        color: '#8B5CF6',
        fields: [{ name: 'Membres mis à jour', value: `${result.updated} / ${result.total}`, inline: true }],
      });
    }
    return result;
  }

  /** Toutes les heures : relance syncGuild pour chaque serveur dont l'intervalle programmé est écoulé. */
  private async runScheduledSyncTick(): Promise<void> {
    if (!this.client) return;
    const now = Date.now();
    for (const [guildId, config] of this.configs.entries()) {
      if (!config.enabled || !config.scheduledSyncEnabled) continue;
      const last = config.lastScheduledSyncAt ? Date.parse(config.lastScheduledSyncAt) : 0;
      if (now - last < config.scheduledSyncIntervalHours * 3_600_000) continue;
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) continue;
      try {
        const result = await this.syncGuild(guild);
        this.updateConfig(guildId, { lastScheduledSyncAt: new Date().toISOString() });
        if (result.updated > 0) {
          logger.info(`[AutoRole] Synchro programmée sur "${guild.name}" : ${result.updated}/${result.total} membre(s) mis à jour.`);
        }
      } catch (err) {
        logger.error(`[AutoRole] Échec de la synchro programmée sur ${guildId} :`, err);
      }
    }
  }
}

export const autoRoleService = new AutoRoleService();
