import fs from 'fs';
import path from 'path';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { AutoRoleConfig, AutoRoleConfigSchema } from '../types/autoRoleConfig.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class AutoRoleService {
  private configPath = path.resolve(process.cwd(), 'data', 'auto_roles.json');
  private configs = new Map<string, AutoRoleConfig>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
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

  public async assignOnJoin(member: GuildMember): Promise<string[]> {
    const guild = member.guild;
    const config = this.getConfig(guild.id);

    if (!config.enabled || !config.roleIds || config.roleIds.length === 0) {
      return [];
    }

    // Filtre bots vs humains
    const isBot = member.user.bot;
    if (isBot && !config.applyToBots) return [];
    if (!isBot && !config.applyToHumans) return [];

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      logger.warn(`[AutoRole] Permission ManageRoles manquante sur le serveur ${guild.name}.`);
      return [];
    }

    const assignedNames: string[] = [];
    const botHighest = botMember.roles.highest.position;

    for (const roleId of config.roleIds) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (!role || role.managed || role.id === guild.id) continue;

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
}

export const autoRoleService = new AutoRoleService();
