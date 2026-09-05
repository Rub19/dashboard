import { Guild, Role } from 'discord.js';

export type RoleCategory = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'VIP' | 'BOT' | 'MEMBER';

export interface DetectedRole {
  roleId: string;
  roleName: string;
  roleColor: number;
  position: number;
  memberCount: number;
  detectedCategory: RoleCategory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedPermissions: string[];
  recommendationLabel: string;
}

export interface PermissionPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  adminRoles: string[];
  modRoles: string[];
  vipRoles: string[];
}

export class RolePermissionService {
  // Dictionnaires multilingues de détection (FR / EN / ES / DE)
  private static readonly KEYWORDS: Record<RoleCategory, string[]> = {
    OWNER: [
      'owner',
      'propriétaire',
      'proprietaire',
      'fondateur',
      'fondatrice',
      'creator',
      'créateur',
      'inhaber',
      'gründer',
      'creador',
      'fundador',
      'fondatore',
      'head',
      'supreme',
      'boss',
    ],
    ADMIN: [
      'admin',
      'administrateur',
      'administratrice',
      'administrator',
      'administrador',
      'gerant',
      'gérant',
      'manager',
      'lead',
      'direction',
      'directeur',
      'co-owner',
      'co-fondateur',
      'resp',
      'responsable',
      'vorstand',
    ],
    MODERATOR: [
      'mod',
      'modérateur',
      'moderateur',
      'moderatrice',
      'moderator',
      'moderador',
      'staff',
      'équipe',
      'equipe',
      'team',
      'helper',
      'assistant',
      'support',
      'trial mod',
      'helfer',
      'ayudante',
    ],
    VIP: [
      'vip',
      'booster',
      'server booster',
      'donateur',
      'sponsor',
      'premium',
      'nitro',
      'patron',
      'supporter',
      'elite',
      'donator',
      'star',
    ],
    BOT: ['bot', 'bots', 'robot', 'apps', 'application'],
    MEMBER: [
      'membre',
      'member',
      'mitglied',
      'miembro',
      'joueur',
      'player',
      'user',
      'utilisateur',
      'communauté',
      'community',
      'everyone',
      '@everyone',
    ],
  };

  /**
   * Analyse automatiquement l'ensemble des rôles d'un serveur et suggère des permissions
   */
  public static analyzeGuildRoles(guild: Guild): DetectedRole[] {
    const roles = Array.from(guild.roles.cache.values())
      .filter((r) => r.id !== guild.id) // Exclure @everyone pour l'analyse individuelle
      .sort((a, b) => b.position - a.position);

    return roles.map((role) => {
      const name = role.name.toLowerCase().trim();
      let category: RoleCategory = 'MEMBER';
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      if (role.managed) {
        category = 'BOT';
        confidence = 'HIGH';
      } else {
        // Recherche dans les dictionnaires par priorité (OWNER -> ADMIN -> MODERATOR -> VIP -> MEMBER)
        for (const cat of ['OWNER', 'ADMIN', 'MODERATOR', 'VIP', 'MEMBER'] as RoleCategory[]) {
          const list = this.KEYWORDS[cat];
          const exactMatch = list.some((k) => name === k || name === `[${k}]` || name === `⭐ ${k}`);
          if (exactMatch) {
            category = cat;
            confidence = 'HIGH';
            break;
          }

          const partialMatch = list.some((k) => name.includes(k));
          if (partialMatch) {
            category = cat;
            confidence = 'MEDIUM';
            break;
          }
        }
      }

      // Si le rôle a la permission Administrateur Discord native, le classer Admin au minimum
      if (role.permissions.has('Administrator') && category !== 'OWNER') {
        category = 'ADMIN';
        confidence = 'HIGH';
      } else if (role.permissions.has('ManageGuild') && category === 'MEMBER') {
        category = 'MODERATOR';
        confidence = 'MEDIUM';
      }

      const { permissions, label } = this.getRecommendedPermissions(category);

      return {
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        position: role.position,
        memberCount: role.members.size,
        detectedCategory: category,
        confidence,
        recommendedPermissions: permissions,
        recommendationLabel: label,
      };
    });
  }

  /**
   * Recommandations de permissions selon la catégorie détectée
   */
  public static getRecommendedPermissions(category: RoleCategory): {
    permissions: string[];
    label: string;
  } {
    switch (category) {
      case 'OWNER':
        return {
          permissions: ['ALL_PERMISSIONS', 'BYPASS_SECURITY', 'BOT_CONTROL', 'ADMIN_SETTINGS'],
          label: '👑 Contrôle Total Suprême (Toutes les permissions)',
        };
      case 'ADMIN':
        return {
          permissions: ['ADMIN_SETTINGS', 'AUTOMOD_CONFIG', 'MOD_ALL', 'AI_SETUP', 'CLEAR_ALL'],
          label: '🛡️ Administration Complète (Config bot, modération & sécurité)',
        };
      case 'MODERATOR':
        return {
          permissions: ['MOD_KICK', 'MOD_BAN', 'MOD_TIMEOUT', 'MOD_WARN', 'MOD_CLEAR', 'MOD_SLOWMODE'],
          label: '⚔️ Modération Standard (Sanctions, timeouts et gestion du chat)',
        };
      case 'VIP':
        return {
          permissions: ['MUSIC_PRIORITY', 'AI_EXTENDED_QUOTA', 'GIVEAWAYS_CREATE'],
          label: '💎 Avantages VIP (Priorité musique & fonctionnalités avancées)',
        };
      case 'BOT':
        return {
          permissions: ['BOT_INTEGRATION'],
          label: '🤖 Rôle applicatif Bot',
        };
      case 'MEMBER':
      default:
        return {
          permissions: ['AI_CHAT_PUBLIC', 'GENERAL_COMMANDS', 'MUSIC_PLAY'],
          label: '👥 Accès Membre (Commandes publiques & salon IA dédié)',
        };
    }
  }

  /**
   * Génère les 4 profils de présets recommandés applicables en 1 clic
   */
  public static generatePresets(guild: Guild): PermissionPreset[] {
    const detected = this.analyzeGuildRoles(guild);

    const ownerRoles = detected.filter((r) => r.detectedCategory === 'OWNER').map((r) => r.roleId);
    const adminRoles = detected.filter((r) => r.detectedCategory === 'ADMIN').map((r) => r.roleId);
    const modRoles = detected.filter((r) => r.detectedCategory === 'MODERATOR').map((r) => r.roleId);
    const vipRoles = detected.filter((r) => r.detectedCategory === 'VIP').map((r) => r.roleId);

    return [
      {
        id: 'PRESET_STRICT',
        name: '🛡️ Sécurité Maximale',
        emoji: '🛡️',
        description: 'Seuls le Fondateur et les Admins certifiés peuvent configurer le bot et modérer.',
        adminRoles: [...ownerRoles, ...adminRoles],
        modRoles: adminRoles,
        vipRoles,
      },
      {
        id: 'PRESET_BALANCED',
        name: '⚖️ Équilibré (Recommandé)',
        emoji: '⚖️',
        description: 'Admins pour la configuration et la sécurité, Modérateurs pour les sanctions et le chat.',
        adminRoles: [...ownerRoles, ...adminRoles],
        modRoles: [...adminRoles, ...modRoles],
        vipRoles,
      },
      {
        id: 'PRESET_COMMUNITY',
        name: '🎉 Communauté Dynamique',
        emoji: '🎉',
        description: 'Permissions étendues pour les animateurs et VIP, modération allouée au staff complet.',
        adminRoles: [...ownerRoles, ...adminRoles],
        modRoles: [...adminRoles, ...modRoles, ...vipRoles],
        vipRoles,
      },
    ];
  }
}
